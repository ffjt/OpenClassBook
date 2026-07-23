import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.user import RefreshToken, User


def _other_owner_headers(factory: sessionmaker[Session]) -> dict[str, str]:
    now = datetime.now(UTC)
    with factory() as session:
        user = User(
            email="other-owner@openclassbook.test",
            username="Other Owner",
            password_hash="not-used",
            created_at=now,
            updated_at=now,
        )
        session.add(user)
        session.flush()
        session_id = secrets.token_urlsafe(24)
        session.add(
            RefreshToken(
                user_id=user.id,
                session_id=session_id,
                token_hash=secrets.token_hex(32),
                expires_at=now + timedelta(days=30),
                created_at=now,
            )
        )
        session.commit()
        access_token = jwt.encode(
            {
                "sub": str(user.id),
                "type": "access",
                "jti": secrets.token_urlsafe(18),
                "sid": session_id,
                "iat": now,
                "exp": now + timedelta(minutes=15),
            },
            settings.auth_jwt_secret,
            algorithm="HS256",
        )
    return {"Authorization": f"Bearer {access_token}"}


def _create_book(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/v1/books",
        json={
            "title": "Security Test Book",
            "description": "Authorization regression coverage",
            "owner_name": "Test Owner",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_owner_resources_reject_unauthenticated_and_cross_owner_access(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    book = _create_book(client)
    book_id = int(book["id"])
    other_headers = _other_owner_headers(test_session_factory)

    assert (
        client.get(
            f"/api/v1/books/{book_id}",
            headers={"Authorization": "Bearer invalid"},
        ).status_code
        == 401
    )
    assert (
        client.get(f"/api/v1/books/{book_id}", headers=other_headers).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/books/{book_id}",
            headers=other_headers,
            json={"title": "Stolen"},
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/v1/books/{book_id}/export",
            headers=other_headers,
        ).status_code
        == 404
    )


def test_author_token_only_allows_the_matching_author(client: TestClient) -> None:
    book = _create_book(client)
    book_id = int(book["id"])
    invite_code = str(book["invite_code"])
    first_join = client.post(
        f"/api/v1/join/{invite_code}", json={"name": "First Author"}
    )
    second_join = client.post(
        f"/api/v1/join/{invite_code}", json={"name": "Second Author"}
    )
    assert first_join.status_code == 200
    assert second_join.status_code == 200
    first = first_join.json()
    second = second_join.json()
    first_headers = {"Authorization": f"Bearer {first['author_token']}"}
    second_headers = {"Authorization": f"Bearer {second['author_token']}"}

    created = client.post(
        f"/api/v1/books/{book_id}/articles",
        headers=first_headers,
        json={
            "author_id": first["author_id"],
            "title": "Private draft",
            "content": "Only its author and the owner can read this.",
        },
    )
    assert created.status_code == 201, created.text
    article_id = created.json()["id"]
    assert (
        client.get(
            f"/api/v1/authors/{first['author_id']}", headers=first_headers
        ).status_code
        == 200
    )
    assert (
        client.get(f"/api/v1/articles/{article_id}", headers=second_headers).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/v1/books/{book_id}/articles",
            headers=second_headers,
            json={
                "author_id": first["author_id"],
                "title": "Impersonation attempt",
                "content": "blocked",
            },
        ).status_code
        == 404
    )
    book_response = client.get(f"/api/v1/books/{book_id}", headers=first_headers)
    assert book_response.status_code == 401
    invitation_response = client.get(
        f"/api/v1/books/{book_id}/invitations", headers=first_headers
    )
    assert invitation_response.status_code == 401
