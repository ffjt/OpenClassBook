import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.book import Book
from app.models.user import RefreshToken, User


def _access_token(user_id: int, session_id: str) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user_id),
            "type": "access",
            "jti": secrets.token_urlsafe(18),
            "sid": session_id,
            "iat": now,
            "exp": now + timedelta(minutes=15),
        },
        settings.auth_jwt_secret,
        algorithm="HS256",
    )


def test_books_are_isolated_by_authenticated_owner(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    created = client.post(
        "/api/v1/books",
        json={
            "title": "Owner One Book",
            "description": None,
            "owner_name": "Owner One",
            "number_mode": "none",
        },
    )
    assert created.status_code == 201
    book_id = created.json()["id"]

    with test_session_factory() as session:
        owner_book = session.get(Book, book_id)
        assert owner_book is not None
        assert owner_book.owner_id == 1
        second_owner = User(
            email="second-owner@openclassbook.test",
            username="Second Owner",
            password_hash="not-used-in-api-tests",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        session.add(second_owner)
        session.flush()
        session_id = secrets.token_urlsafe(24)
        session.add(
            RefreshToken(
                user_id=second_owner.id,
                session_id=session_id,
                token_hash=secrets.token_hex(32),
                expires_at=datetime.now(UTC) + timedelta(days=30),
                created_at=datetime.now(UTC),
            )
        )
        session.commit()
        session.refresh(second_owner)
        second_owner_id = second_owner.id

    default_authorization = client.headers.pop("Authorization")
    try:
        assert client.get("/api/v1/books").status_code == 401
    finally:
        client.headers["Authorization"] = default_authorization

    other_headers = {
        "Authorization": f"Bearer {_access_token(second_owner_id, session_id)}"
    }
    assert client.get("/api/v1/books", headers=other_headers).json() == []
    assert (
        client.get(f"/api/v1/books/{book_id}", headers=other_headers).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/books/{book_id}",
            headers=other_headers,
            json={"title": "Attempted overwrite"},
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/v1/books/{book_id}/export", headers=other_headers
        ).status_code
        == 404
    )

    with test_session_factory() as session:
        owner_book = session.scalar(select(Book).where(Book.id == book_id))
        assert owner_book is not None
        assert owner_book.title == "Owner One Book"
