import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.database import engine
from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.models.template import Template
from app.services.pdf_renderer import _first_cjk_font


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
    assert created["cover_file"] is None
    assert created["preface_file"] is None
    assert created["afterword_file"] is None
    assert created["acknowledgement_file"] is None
    assert created["back_cover_file"] is None
    assert created["layout_sections"] is None
    assert created["layout_article_order"] is None
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
        json={
            "title": "Updated Stories",
            "description": None,
            "cover_file": "cover.webp",
            "preface_file": "preface.pdf",
            "afterword_file": "afterword.docx",
            "acknowledgement_file": "acknowledgements.pdf",
            "back_cover_file": "back-cover.webp",
            "layout_sections": [
                {
                    "id": "cover",
                    "kind": "page",
                    "preset": "cover",
                    "name": None,
                    "file": "cover.webp",
                },
                {
                    "id": "articles",
                    "kind": "articles",
                    "preset": "articles",
                    "name": None,
                    "file": None,
                },
                {
                    "id": "class_message",
                    "kind": "page",
                    "preset": None,
                    "name": "A Message from Our Class",
                    "file": None,
                },
            ],
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Updated Stories"
    assert updated["description"] is None
    assert updated["cover_file"] == "cover.webp"
    assert updated["preface_file"] == "preface.pdf"
    assert updated["afterword_file"] == "afterword.docx"
    assert updated["acknowledgement_file"] == "acknowledgements.pdf"
    assert updated["back_cover_file"] == "back-cover.webp"
    assert [section["id"] for section in updated["layout_sections"]] == [
        "cover",
        "articles",
        "class_message",
    ]
    assert updated["owner_name"] == created["owner_name"]
    assert updated["invite_code"] == created["invite_code"]

    with test_session_factory() as session:
        persisted = session.get(Book, created["id"])
        assert persisted is not None
        assert persisted.cover_file == "cover.webp"
        assert persisted.preface_file == "preface.pdf"
        assert persisted.afterword_file == "afterword.docx"
        assert persisted.acknowledgement_file == "acknowledgements.pdf"
        assert persisted.back_cover_file == "back-cover.webp"
        assert persisted.layout_sections is not None
        assert persisted.layout_sections[2]["name"] == "A Message from Our Class"

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


@pytest.mark.parametrize(
    "sections",
    [
        [
            {
                "id": "preface",
                "kind": "page",
                "preset": "preface",
            }
        ],
        [
            {
                "id": "articles",
                "kind": "articles",
                "preset": "articles",
            },
            {
                "id": "articles-copy",
                "kind": "articles",
                "preset": "articles",
            },
        ],
        [
            {
                "id": "articles",
                "kind": "articles",
                "preset": "articles",
                "name": "Renamed body",
            }
        ],
    ],
)
def test_book_layout_requires_one_fixed_main_content_section(
    client: TestClient,
    sections: list[dict[str, object]],
) -> None:
    response = client.post(
        "/api/v1/books",
        json={
            "title": "Layout validation",
            "owner_name": "Alex",
            "layout_sections": sections,
        },
    )
    assert response.status_code == 422


def test_book_errors_use_correct_status_codes(client: TestClient) -> None:
    assert client.get("/api/v1/books/999").status_code == 404
    assert client.patch("/api/v1/books/999", json={}).status_code == 400
    assert (
        client.patch(
            "/api/v1/books/999",
            json={"title": None},
        ).status_code
        == 422
    )
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
            uuid=uuid4(),
            name="Avery",
            created_at=now,
            updated_at=now,
        )
        other_author = Author(
            book_id=other_book.id,
            uuid=uuid4(),
            name="Jordan",
            created_at=now,
            updated_at=now,
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
                    image=None,
                    number="001",
                    status="approved",
                    created_at=now,
                    updated_at=now,
                ),
                Article(
                    book_id=other_book.id,
                    author_id=other_author.id,
                    title="Other submission",
                    content="Not part of this dashboard",
                    image=None,
                    number="002",
                    status="pending",
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
    assert articles_response.json()[0]["status"] == "approved"

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

    assert (
        client.patch(
            "/api/v1/books/999/template",
            json={"title_format": {"size": 24}},
        ).status_code
        == 404
    )


def test_author_crud_persists_to_sqlite(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Authors Test",
            "description": None,
            "owner_name": "Alex",
            "number_mode": "automatic",
        },
    ).json()
    collection = f"/api/v1/books/{book['id']}/authors"

    create_response = client.post(
        collection,
        json={"name": " Avery "},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["book_id"] == book["id"]
    assert created["name"] == "Avery"
    assert created["created_at"]
    assert created["updated_at"]
    assert "uuid" not in created

    with test_session_factory() as session:
        persisted = session.get(Author, created["id"])
        assert persisted is not None
        assert persisted.uuid is not None

    assert client.get(collection).json() == [created]
    author_detail = client.get(f"/api/v1/authors/{created['id']}").json()
    assert {key: author_detail[key] for key in created} == created
    assert author_detail["book"]["id"] == book["id"]
    assert author_detail["book"]["title"] == "Authors Test"

    update_response = client.patch(
        f"/api/v1/authors/{created['id']}",
        json={"name": "Avery Lee"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["name"] == "Avery Lee"

    assert client.patch(f"/api/v1/authors/{created['id']}", json={}).status_code == 400
    assert client.delete(f"/api/v1/authors/{created['id']}").status_code == 204
    assert client.get(f"/api/v1/authors/{created['id']}").status_code == 404
    assert client.get(collection).json() == []


def test_invitation_join_and_welcome_flow_persists_to_sqlite(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Our Class Stories",
            "description": "A real invitation flow",
            "owner_name": "Ms. Zhang",
            "number_mode": "automatic",
        },
    ).json()

    invite_response = client.get(f"/api/v1/books/{book['id']}/invite")
    assert invite_response.status_code == 200
    assert invite_response.json() == {
        "book_id": book["id"],
        "title": "Our Class Stories",
        "owner_name": "Ms. Zhang",
        "invite_code": book["invite_code"],
    }

    join_path = f"/api/v1/join/{book['invite_code']}"
    invitation_response = client.get(join_path)
    assert invitation_response.status_code == 200
    assert invitation_response.json()["book"] == book

    join_response = client.post(join_path, json={"name": "  Zhang San  "})
    assert join_response.status_code == 200
    assert join_response.json()["mode"] == "created"
    author_id = join_response.json()["author_id"]

    with test_session_factory() as session:
        author = session.get(Author, author_id)
        assert author is not None
        assert author.book_id == book["id"]
        assert author.name == "Zhang San"
        assert author.uuid is not None
        assert author.created_at is not None

    welcome_response = client.get(f"/api/v1/authors/{author_id}")
    assert welcome_response.status_code == 200
    welcome = welcome_response.json()
    assert welcome["name"] == "Zhang San"
    assert welcome["book"]["title"] == "Our Class Stories"
    assert welcome["book"]["owner_name"] == "Ms. Zhang"
    assert welcome["book"]["description"] == "A real invitation flow"
    assert welcome["book"]["number_mode"] == "automatic"
    assert welcome["book"]["author_count"] == 1


def test_invalid_invitation_returns_404(client: TestClient) -> None:
    assert client.get("/api/v1/books/999/invite").status_code == 404
    assert client.get("/api/v1/join/OCB-NOT123").status_code == 404
    assert (
        client.post(
            "/api/v1/join/OCB-NOT123",
            json={"name": "Alex"},
        ).status_code
        == 404
    )


def test_article_crud_and_review_status_persist_to_sqlite(client: TestClient) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Review Test",
            "description": None,
            "owner_name": "Alex",
            "number_mode": "automatic",
        },
    ).json()
    author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Avery"},
    ).json()
    collection = f"/api/v1/books/{book['id']}/articles"

    create_response = client.post(
        collection,
        json={
            "author_id": author["id"],
            "number": "001",
            "title": "A real draft",
            "content": "Stored in SQLite",
            "image": "https://example.com/image.jpg",
            "status": "draft",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["book_id"] == book["id"]
    assert created["status"] == "draft"
    assert created["submitted_at"] is None
    assert created["image"] == "https://example.com/image.jpg"
    assert (
        client.get(
            collection,
            params={"include_drafts": "false"},
        ).json()
        == []
    )
    preview = client.get(f"/api/v1/authors/{author['id']}/preview").json()
    assert preview["article_count"] == 1
    assert preview["latest_article"]["status"] == "draft"

    assert client.get(collection).json() == [created]
    assert client.get(f"/api/v1/articles/{created['id']}").json() == created

    update_response = client.patch(
        f"/api/v1/articles/{created['id']}",
        json={"title": "A real submission", "status": "pending"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "A real submission"
    assert update_response.json()["status"] == "pending"
    submitted_at = update_response.json()["submitted_at"]
    assert submitted_at is not None
    assert client.get(
        collection,
        params={"include_drafts": "false"},
    ).json() == [update_response.json()]

    approve_response = client.patch(
        f"/api/v1/articles/{created['id']}/status",
        json={"status": "approved"},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "approved"
    assert approve_response.json()["submitted_at"] == submitted_at
    assert (
        client.get(f"/api/v1/authors/{author['id']}/preview").json()["latest_article"][
            "status"
        ]
        == "approved"
    )

    assert (
        client.patch(
            f"/api/v1/articles/{created['id']}/status",
            json={"status": "invalid"},
        ).status_code
        == 422
    )
    assert client.delete(f"/api/v1/articles/{created['id']}").status_code == 204
    assert client.get(f"/api/v1/articles/{created['id']}").status_code == 404
    assert client.get(collection).json() == []
    assert client.get(f"/api/v1/authors/{author['id']}/preview").json() == {
        "article_count": 0,
        "latest_article": None,
    }


def test_join_restores_unique_name_and_requires_selection_for_duplicates(
    client: TestClient,
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Identity Test",
            "owner_name": "Editor",
            "number_mode": "none",
        },
    ).json()
    join_path = f"/api/v1/join/{book['invite_code']}"

    first = client.post(join_path, json={"name": "张三"}).json()
    assert first["mode"] == "created"
    restored = client.post(join_path, json={"name": "张三"}).json()
    assert restored == {"mode": "restored", "author_id": first["author_id"]}

    duplicate = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "张三"},
    ).json()
    selection = client.post(join_path, json={"name": "张三"}).json()
    assert selection == {"mode": "selection_required", "author_id": None}

    matches = client.get(
        f"/api/v1/books/{book['id']}/authors/search",
        params={"name": "张三"},
    ).json()
    assert {author["id"] for author in matches} == {
        first["author_id"],
        duplicate["id"],
    }
    assert all("uuid" not in author for author in matches)


def test_author_can_manage_multiple_articles_and_preview_latest(
    client: TestClient,
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Multiple Articles",
            "owner_name": "Editor",
            "number_mode": "automatic",
        },
    ).json()
    author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Avery"},
    ).json()

    first = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": author["id"],
            "number": "017",
            "title": "First",
            "content": "A" * 140,
        },
    ).json()
    second = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": author["id"],
            "number": "003",
            "title": "Second",
            "content": "Latest article",
            "status": "pending",
        },
    ).json()

    articles = client.get(f"/api/v1/authors/{author['id']}/articles").json()
    assert {article["id"] for article in articles} == {first["id"], second["id"]}
    assert first["number"] == "017"
    assert second["number"] == "003"

    missing_number = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={"author_id": author["id"], "title": "Missing number"},
    )
    assert missing_number.status_code == 409

    preview = client.get(f"/api/v1/authors/{author['id']}/preview").json()
    assert preview["article_count"] == 2
    assert preview["latest_article"]["title"] == "Second"
    assert preview["latest_article"]["excerpt"] == "Latest article"
    assert preview["latest_article"]["status"] == "pending"

    other_author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Blake"},
    ).json()
    duplicate = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": other_author["id"],
            "number": "017",
            "title": "Duplicate number",
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["message_zh"] == "这个文章编号已被认领"


def test_layout_assigns_book_wide_numbers_only_when_numbering_is_disabled(
    client: TestClient,
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Layout Numbering",
            "owner_name": "Editor",
            "number_mode": "none",
        },
    ).json()
    first_author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Avery"},
    ).json()
    second_author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Blake"},
    ).json()
    first = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": first_author["id"],
            "number": "999",
            "title": "First",
            "status": "approved",
        },
    ).json()
    second = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": second_author["id"],
            "number": "999",
            "title": "Second",
            "status": "approved",
        },
    ).json()
    assert first["number"] == second["number"] == ""

    assigned = client.patch(
        f"/api/v1/books/{book['id']}/articles/numbers",
        json={"article_ids": [second["id"], first["id"]]},
    )
    assert assigned.status_code == 200
    assert [article["number"] for article in assigned.json()] == ["001", "002"]
    assert [article["author_id"] for article in assigned.json()] == [
        second_author["id"],
        first_author["id"],
    ]
    assert client.get(f"/api/v1/books/{book['id']}").json()[
        "layout_article_order"
    ] == [second["id"], first["id"]]
    reassigned = client.patch(
        f"/api/v1/books/{book['id']}/articles/numbers",
        json={"article_ids": [first["id"], second["id"]]},
    )
    assert reassigned.status_code == 200
    assert [article["number"] for article in reassigned.json()] == ["001", "002"]

    automatic_book = client.post(
        "/api/v1/books",
        json={
            "title": "Claim Numbering",
            "owner_name": "Editor",
            "number_mode": "automatic",
        },
    ).json()
    assert (
        client.patch(
            f"/api/v1/books/{automatic_book['id']}/articles/numbers",
            json={"article_ids": [first["id"]]},
        ).status_code
        == 400
    )


def test_layout_reorders_articles_without_overwriting_claimed_numbers(
    client: TestClient,
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Custom publication order",
            "owner_name": "Editor",
            "number_mode": "automatic",
        },
    ).json()
    author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Avery"},
    ).json()
    first = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": author["id"],
            "number": "010",
            "title": "First by number",
            "status": "approved",
        },
    ).json()
    second = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": author["id"],
            "number": "020",
            "title": "Second by number",
            "status": "approved",
        },
    ).json()

    reordered = client.patch(
        f"/api/v1/books/{book['id']}/articles/order",
        json={"article_ids": [second["id"], first["id"]]},
    )
    assert reordered.status_code == 200
    assert [article["id"] for article in reordered.json()] == [
        second["id"],
        first["id"],
    ]
    assert [article["number"] for article in reordered.json()] == ["020", "010"]
    assert client.get(f"/api/v1/books/{book['id']}").json()[
        "layout_article_order"
    ] == [second["id"], first["id"]]

    preview = client.get(f"/api/v1/books/{book['id']}/export").json()
    article_pages = [
        page["label_en"]
        for page in preview["preview_pages"]
        if page["kind"] == "article"
    ]
    assert article_pages == ["Second by number", "First by number"]

    invalid = client.patch(
        f"/api/v1/books/{book['id']}/articles/order",
        json={"article_ids": [first["id"]]},
    )
    assert invalid.status_code == 400


def test_export_is_blocked_without_approved_articles(client: TestClient) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Empty Export",
            "owner_name": "Editor",
            "number_mode": "automatic",
        },
    ).json()

    preview = client.get(f"/api/v1/books/{book['id']}/export")
    assert preview.status_code == 200
    assert preview.json()["can_export"] is False
    assert preview.json()["stats"]["article_count"] == 0
    assert preview.json()["warnings_zh"] == ["未设置封面。将使用默认封面。"]

    generated = client.post(f"/api/v1/books/{book['id']}/export")
    assert generated.status_code == 409
    assert generated.json()["detail"] == {
        "code": "no_publishable_content",
        "message": "There is no publishable content.",
        "message_zh": "暂无可出版内容。",
    }


def test_pdf_font_selection_rejects_ext_b_only_font() -> None:
    font_root = Path("C:/Windows/Fonts")
    ext_b = font_root / "simsunb.ttf"
    common_chinese = font_root / "msyhbd.ttc"
    if not ext_b.exists() or not common_chinese.exists():
        pytest.skip("Windows Chinese fonts are not installed")
    assert _first_cjk_font([ext_b, common_chinese]) == common_chinese


def test_export_generates_and_downloads_printable_pdf(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(settings, "export_dir", tmp_path)
    book = client.post(
        "/api/v1/books",
        json={
            "title": "我们的班级故事",
            "description": "A bilingual class book",
            "owner_name": "陈老师",
            "number_mode": "automatic",
        },
    ).json()
    book_id = book["id"]
    client.patch(
        f"/api/v1/books/{book_id}",
        json={
            "layout_sections": [
                {
                    "id": "cover",
                    "kind": "page",
                    "preset": "cover",
                    "name": None,
                    "file": None,
                },
                {
                    "id": "articles",
                    "kind": "articles",
                    "preset": "articles",
                    "name": None,
                    "file": None,
                },
                {
                    "id": "thanks",
                    "kind": "page",
                    "preset": "acknowledgement",
                    "name": None,
                    "file": None,
                },
            ]
        },
    )
    template = client.patch(
        f"/api/v1/books/{book_id}/template",
        json={
            "title_format": {"size": 22, "align": "center", "bold": True},
            "body_format": {
                "font": {"family": "serif", "fullName": "System Serif"},
                "size": 13,
                "line_height": 1.6,
                "first_line_indent": 2,
                "justify": True,
            },
            "image_rules": {"max_width": 68},
            "numbering_rules": {"show": True, "position": "above"},
            "page_rules": {
                "size": "a5",
                "margin": "normal",
                "number_position": "center",
            },
        },
    )
    assert template.status_code == 200
    author = client.post(
        f"/api/v1/books/{book_id}/authors",
        json={"name": "林同学"},
    ).json()
    for number, title in [("10", "第十篇"), ("2", "第二篇")]:
        response = client.post(
            f"/api/v1/books/{book_id}/articles",
            json={
                "author_id": author["id"],
                "number": number,
                "title": title,
                "content": "这是审核通过的正文。\n\nThis article is ready to print.",
                "status": "approved",
            },
        )
        assert response.status_code == 201

    preview = client.get(f"/api/v1/books/{book_id}/export")
    assert preview.status_code == 200
    preview_data = preview.json()
    assert preview_data["can_export"] is True
    assert preview_data["template"]["page_size"] == "a5"
    assert preview_data["stats"]["article_count"] == 2
    assert [section["preset"] for section in preview_data["sections"]] == [
        "cover",
        "articles",
        "acknowledgement",
    ]
    article_pages = [
        page["label_zh"]
        for page in preview_data["preview_pages"]
        if page["kind"] == "article"
    ]
    assert article_pages == ["第二篇", "第十篇"]

    generated = client.post(f"/api/v1/books/{book_id}/export")
    assert generated.status_code == 200
    result = generated.json()
    assert result["status"] == "success"
    assert re.fullmatch(r"[a-f0-9]{32}", result["task_id"])
    assert result["page_count"] >= 4
    artifact = tmp_path / f"book-{book_id}-{result['task_id']}.pdf"
    assert artifact.read_bytes().startswith(b"%PDF")

    download = client.get(result["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"
    assert download.content.startswith(b"%PDF")
    assert (
        client.get(f"/api/v1/books/{book_id}/export/not-a-task/download").status_code
        == 404
    )
