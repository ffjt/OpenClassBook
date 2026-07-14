import re
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session, sessionmaker

from app.db.database import engine
from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.models.template import Template


def test_system_routes_and_swagger(client: TestClient) -> None:
    assert client.get("/").json() == {
        "message": "OpenClassBook Backend API",
        "message_zh": "OpenClassBook 后端 API",
    }
    assert client.get("/health").json() == {
        "status": "ok",
        "status_zh": "正常",
    }
    assert client.get("/docs").status_code == 200

    schema = client.get("/openapi.json").json()
    book_path = schema["paths"]["/api/v1/books"]
    item_path = schema["paths"]["/api/v1/books/{book_id}"]
    assert {"get", "post"} <= book_path.keys()
    assert {"get", "patch", "delete"} <= item_path.keys()


def test_cors_allows_private_network_frontend(client: TestClient) -> None:
    origin = "http://192.168.31.105:5181"
    response = client.options(
        "/api/v1/books",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_rejects_public_origin(client: TestClient) -> None:
    response = client.options(
        "/api/v1/books",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_book_crud_persists_to_sqlite(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    create_response = client.post(
        "/api/v1/books",
        json={
            "title": "  Our Class Stories  ",
            "description": "A class collection",
            "owner_name": "  Alex Chen  ",
            "number_mode": "automatic",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "Our Class Stories"
    assert created["description"] == "A class collection"
    assert created["owner_name"] == "Alex Chen"
    assert created["number_mode"] == "automatic"
    assert created["status"] == "collecting"
    assert created["author_count"] == 0
    assert re.fullmatch(r"OCB-[A-Z0-9]{6}", created["invite_code"])
    assert created["created_at"]
    assert created["updated_at"]

    with test_session_factory() as session:
        persisted = session.get(Book, created["id"])
        assert persisted is not None
        assert persisted.title == "Our Class Stories"

    list_response = client.get("/api/v1/books")
    assert list_response.status_code == 200
    assert list_response.json() == [created]

    get_response = client.get(f"/api/v1/books/{created['id']}")
    assert get_response.status_code == 200
    assert get_response.json() == created

    update_response = client.patch(
        f"/api/v1/books/{created['id']}",
        json={"title": "Updated Stories", "description": None},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Updated Stories"
    assert updated["description"] is None
    assert updated["owner_name"] == created["owner_name"]
    assert updated["invite_code"] == created["invite_code"]

    delete_response = client.delete(f"/api/v1/books/{created['id']}")
    assert delete_response.status_code == 204
    assert delete_response.content == b""
    assert client.get(f"/api/v1/books/{created['id']}").status_code == 404
    assert client.get("/api/v1/books").json() == []


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "   ", "owner_name": "Alex", "number_mode": "none"},
        {"title": "Stories", "owner_name": "   ", "number_mode": "none"},
        {"title": "Stories", "owner_name": "Alex", "number_mode": "invalid"},
    ],
)
def test_book_create_validation_returns_422(
    client: TestClient,
    payload: dict[str, str],
) -> None:
    response = client.post("/api/v1/books", json=payload)
    assert response.status_code == 422


def test_book_errors_use_correct_status_codes(client: TestClient) -> None:
    assert client.get("/api/v1/books/999").status_code == 404
    assert client.patch("/api/v1/books/999", json={}).status_code == 400
    assert client.patch(
        "/api/v1/books/999",
        json={"title": None},
    ).status_code == 422
    assert client.delete("/api/v1/books/999").status_code == 404


def test_sqlite_tables_are_initialized(client: TestClient) -> None:
    table_names = set(inspect(engine).get_table_names())
    assert {"articles", "authors", "books", "templates"} <= table_names


def test_dashboard_collections_are_read_from_sqlite(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    now = datetime.now(UTC)
    with test_session_factory() as session:
        book = Book(
            title="Database Book",
            description="Real dashboard data",
            owner_name="Taylor",
            invite_code="OCB-ABC123",
            number_mode="none",
            created_at=now,
            updated_at=now,
        )
        other_book = Book(
            title="Other Book",
            description=None,
            owner_name="Morgan",
            invite_code="OCB-XYZ789",
            number_mode="none",
            created_at=now,
            updated_at=now,
        )
        session.add_all([book, other_book])
        session.flush()

        author = Author(
            book_id=book.id,
            name="Avery",
            number="001",
            join_status="joined",
            created_at=now,
        )
        other_author = Author(
            book_id=other_book.id,
            name="Jordan",
            number="002",
            join_status="joined",
            created_at=now,
        )
        session.add_all([author, other_author])
        session.flush()

        session.add_all(
            [
                Article(
                    book_id=book.id,
                    author_id=author.id,
                    title="A real submission",
                    content="Stored in SQLite",
                    images=[],
                    number="001",
                    review_status="approved",
                    created_at=now,
                    updated_at=now,
                ),
                Article(
                    book_id=other_book.id,
                    author_id=other_author.id,
                    title="Other submission",
                    content="Not part of this dashboard",
                    images=[],
                    number="002",
                    review_status="pending",
                    created_at=now,
                    updated_at=now,
                ),
                Template(book_id=book.id, title_format={"font": "Inter"}),
            ]
        )
        session.commit()
        book_id = book.id
        other_book_id = other_book.id

    authors_response = client.get(f"/api/v1/books/{book_id}/authors")
    assert authors_response.status_code == 200
    assert [author["name"] for author in authors_response.json()] == ["Avery"]

    books_response = client.get("/api/v1/books")
    books_by_id = {book["id"]: book for book in books_response.json()}
    assert books_by_id[book_id]["author_count"] == 1
    assert books_by_id[other_book_id]["author_count"] == 1

    articles_response = client.get(f"/api/v1/books/{book_id}/articles")
    assert articles_response.status_code == 200
    assert [article["title"] for article in articles_response.json()] == [
        "A real submission"
    ]
    assert articles_response.json()[0]["review_status"] == "approved"

    template_response = client.get(f"/api/v1/books/{book_id}/template")
    assert template_response.status_code == 200
    assert template_response.json()["title_format"] == {"font": "Inter"}

    assert client.get(f"/api/v1/books/{other_book_id}/template").status_code == 404


def test_empty_dashboard_collections_return_empty_lists(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    now = datetime.now(UTC)
    with test_session_factory() as session:
        book = Book(
            title="Empty Book",
            description=None,
            owner_name="Casey",
            invite_code="OCB-EMPTY1",
            number_mode="none",
            created_at=now,
            updated_at=now,
        )
        session.add(book)
        session.commit()
        book_id = book.id

    assert client.get(f"/api/v1/books/{book_id}/authors").json() == []
    assert client.get(f"/api/v1/books/{book_id}/articles").json() == []


def test_template_settings_are_created_and_updated(client: TestClient) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Template Test",
            "description": None,
            "owner_name": "Alex",
            "number_mode": "none",
        },
    ).json()
    endpoint = f"/api/v1/books/{book['id']}/template"

    created_response = client.patch(
        endpoint,
        json={
            "title_format": {"size": 28, "bold": True},
            "page_rules": {"size": "a5", "margin": "wide"},
        },
    )
    assert created_response.status_code == 200
    created = created_response.json()
    assert created["book_id"] == book["id"]
    assert created["title_format"] == {"size": 28, "bold": True}
    assert created["page_rules"] == {"size": "a5", "margin": "wide"}

    updated_response = client.patch(
        endpoint,
        json={"title_format": {"size": 32, "bold": False}},
    )
    assert updated_response.status_code == 200
    updated = updated_response.json()
    assert updated["id"] == created["id"]
    assert updated["title_format"] == {"size": 32, "bold": False}
    assert updated["page_rules"] == created["page_rules"]
    assert client.get(endpoint).json() == updated

    assert client.patch(
        "/api/v1/books/999/template",
        json={"title_format": {"size": 24}},
    ).status_code == 404
