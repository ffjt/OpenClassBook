from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.api.dependencies import get_email_provider_dependency
from app.email_provider import EmailProvider
from app.main import app
from app.models.user import EmailVerificationCode, RefreshToken, User, Workspace


class CapturingEmailProvider(EmailProvider):
    def __init__(self) -> None:
        self.codes: dict[str, str] = {}

    def send_verification_code(
        self, email: str, code: str, expires_at: datetime
    ) -> None:
        self.codes[email] = code


@pytest.fixture
def verification_provider() -> Generator[CapturingEmailProvider, None, None]:
    provider = CapturingEmailProvider()
    app.dependency_overrides[get_email_provider_dependency] = lambda: provider
    yield provider


def test_owner_registration_login_refresh_and_logout(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
    verification_provider: CapturingEmailProvider,
) -> None:
    email = "owner@example.com"
    username = "QA 中文用户名"
    code_response = client.post("/api/auth/verification-code", json={"email": email})
    assert code_response.status_code == 202
    assert verification_provider.codes[email].isdigit()

    registration = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "code": verification_provider.codes[email],
            "password": "secure-owner-password",
            "username": username,
        },
    )
    assert registration.status_code == 201
    payload = registration.json()
    assert payload["user"]["email"] == email
    assert payload["user"]["username"] == username
    assert payload["access_token"]
    assert payload["refresh_token"]

    with test_session_factory() as session:
        user = session.scalar(select(User).where(User.email == email))
        assert user is not None
        assert user.password_hash != "secure-owner-password"
        workspace = session.scalar(
            select(Workspace).where(Workspace.owner_id == user.id)
        )
        assert workspace is not None
        assert workspace.name == f"{username}'s Workspace"
        code_record = session.scalar(
            select(EmailVerificationCode).where(EmailVerificationCode.email == email)
        )
        assert code_record is not None
        assert code_record.consumed_at is not None
        assert code_record.code_hash != verification_provider.codes[email]

    current_user = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
    )
    assert current_user.status_code == 200
    assert current_user.json()["username"] == username

    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "secure-owner-password"},
    )
    assert login.status_code == 200
    refresh_token = login.json()["refresh_token"]
    refreshed = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refreshed.status_code == 200
    assert refreshed.json()["refresh_token"] != refresh_token
    assert (
        client.post(
            "/api/auth/refresh", json={"refresh_token": refresh_token}
        ).status_code
        == 401
    )

    new_refresh_token = refreshed.json()["refresh_token"]
    current_access_token = refreshed.json()["access_token"]
    assert (
        client.post(
            "/api/auth/logout", json={"refresh_token": new_refresh_token}
        ).status_code
        == 204
    )
    assert (
        client.post(
            "/api/auth/refresh", json={"refresh_token": new_refresh_token}
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {current_access_token}"},
        ).status_code
        == 401
    )
    with test_session_factory() as session:
        assert session.scalar(
            select(RefreshToken).where(RefreshToken.revoked_at.is_not(None))
        )


def test_verification_code_is_rate_limited_and_required(
    client: TestClient, verification_provider: CapturingEmailProvider
) -> None:
    email = "rate-limit@example.com"
    assert (
        client.post("/api/auth/verification-code", json={"email": email}).status_code
        == 202
    )
    throttled = client.post("/api/auth/verification-code", json={"email": email})
    assert throttled.status_code == 429
    assert int(throttled.headers["Retry-After"]) > 0

    invalid = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "code": "000000",
            "password": "secure-owner-password",
            "username": "Rate Limit",
        },
    )
    assert invalid.status_code == 400


def test_verification_code_locks_after_five_failed_guesses(
    client: TestClient, verification_provider: CapturingEmailProvider
) -> None:
    email = "locked-code@example.com"
    assert (
        client.post("/api/auth/verification-code", json={"email": email}).status_code
        == 202
    )
    code = verification_provider.codes[email]
    for _ in range(5):
        response = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "code": "000000" if code != "000000" else "999999",
                "password": "secure-owner-password",
                "username": "Locked Code",
            },
        )
        assert response.status_code == 400
    assert (
        client.post(
            "/api/auth/register",
            json={
                "email": email,
                "code": code,
                "password": "secure-owner-password",
                "username": "Locked Code",
            },
        ).status_code
        == 400
    )
