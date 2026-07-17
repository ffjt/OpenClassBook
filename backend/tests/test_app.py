import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader
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


def test_class_collection_formats_author_input_for_join(client: TestClient) -> None:
    book_response = client.post(
        "/api/v1/books",
        json={
            "title": "Class format",
            "owner_name": "Teacher",
            "class_collection_mode": "template",
            "class_name_template": "高二（{value}）班",
        },
    )
    assert book_response.status_code == 201
    book = book_response.json()
    assert book["class_fixed_value"] is None
    assert book["class_name_template"] == "高二（{value}）班"

    missing = client.post(
        f"/api/v1/join/{book['invite_code']}",
        json={"name": "Lin"},
    )
    assert missing.status_code == 422
    assert missing.json()["detail"]["code"] == "class_value_required"

    joined = client.post(
        f"/api/v1/join/{book['invite_code']}",
        json={"name": "Lin", "class_value": "3"},
    )
    assert joined.status_code == 200
    author = client.get(f"/api/v1/authors/{joined.json()['author_id']}").json()
    assert author["class_name"] == "高二（3）班"


def test_fixed_class_is_applied_without_author_input(client: TestClient) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Fixed class",
            "owner_name": "Teacher",
            "class_collection_mode": "fixed",
            "class_fixed_value": "Grade 8 · Class A",
        },
    ).json()
    joined = client.post(
        f"/api/v1/join/{book['invite_code']}",
        json={"name": "Alex"},
    )
    assert joined.status_code == 200
    author = client.get(f"/api/v1/authors/{joined.json()['author_id']}").json()
    assert author["class_name"] == "Grade 8 · Class A"


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
            "number_mode": "existing",
            "existing_number_mode": "import",
            "number_pool": ["001", "002", "003"],
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "Our Class Stories"
    assert created["subtitle"] is None
    assert created["description"] == "A class collection"
    assert created["owner_name"] == "Alex Chen"
    assert created["school"] is None
    assert created["publisher"] is None
    assert created["submission_enabled"] is True
    assert created["submission_deadline"] is None
    assert created["allow_multiple_articles"] is True
    assert created["limit_articles_per_author"] is True
    assert created["max_articles_per_author"] == 5
    assert created["allow_edit_after_submit"] is True
    assert created["allow_delete_article"] is True
    assert created["invite_enabled"] is True
    assert created["number_mode"] == "existing"
    assert created["existing_number_mode"] == "import"
    assert created["number_prefix"] == ""
    assert created["number_digits"] == 3
    assert created["status"] == "collecting"
    assert created["setup_completed"] is False
    assert created["cover_file"] is None
    assert created["preface_file"] is None
    assert created["afterword_file"] is None
    assert created["acknowledgement_file"] is None
    assert created["back_cover_file"] is None
    assert created["layout_sections"] is None
    assert created["layout_article_order"] is None
    assert created["layout_article_page_mode"] == "single"
    assert created["author_count"] == 0
    assert created["article_count"] == 0
    assert created["approved_article_count"] == 0
    assert created["claimed_number_count"] == 0
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
            "setup_completed": True,
            "cover_file": "cover.webp",
            "preface_file": "preface.pdf",
            "afterword_file": "afterword.docx",
            "acknowledgement_file": "acknowledgements.pdf",
            "back_cover_file": "back-cover.webp",
            "layout_article_page_mode": "flow",
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
    assert updated["setup_completed"] is True
    assert updated["cover_file"] == "cover.webp"
    assert updated["preface_file"] == "preface.pdf"
    assert updated["afterword_file"] == "afterword.docx"
    assert updated["acknowledgement_file"] == "acknowledgements.pdf"
    assert updated["back_cover_file"] == "back-cover.webp"
    assert updated["layout_article_page_mode"] == "flow"
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
        assert persisted.layout_article_page_mode == "flow"
        assert persisted.setup_completed is True

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

    missing_pool = client.post(
        "/api/v1/books",
        json={
            "title": "Numbered book",
            "owner_name": "Editor",
            "number_mode": "existing",
            "existing_number_mode": "import",
        },
    )
    assert missing_pool.status_code == 201
    assert missing_pool.json()["number_pool"] == []

    duplicate_pool = client.post(
        "/api/v1/books",
        json={
            "title": "Imported numbers",
            "owner_name": "Editor",
            "number_mode": "existing",
            "existing_number_mode": "import",
            "number_pool": ["001", "001"],
        },
    )
    assert duplicate_pool.status_code == 422


def test_book_numbering_mode_and_pool_stay_consistent(client: TestClient) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "No numbering",
            "owner_name": "Editor",
            "number_mode": "none",
        },
    ).json()

    response = client.patch(
        f"/api/v1/books/{book['id']}",
        json={"number_mode": "automatic"},
    )
    assert response.status_code == 200
    assert response.json()["number_mode"] == "automatic"

    imported = client.patch(
        f"/api/v1/books/{book['id']}",
        json={"number_mode": "existing", "existing_number_mode": "import"},
    )
    assert imported.status_code == 200
    assert imported.json()["number_mode"] == "existing"
    assert imported.json()["number_pool"] == []

    author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Avery"},
    ).json()
    claimed = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": author["id"],
            "number": "017",
            "title": "Claimed",
        },
    )
    assert claimed.status_code == 409

    claim_mode = client.patch(
        f"/api/v1/books/{book['id']}",
        json={"existing_number_mode": "claim"},
    )
    assert claim_mode.status_code == 200
    claimed = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": author["id"],
            "number": "017",
            "title": "Claimed",
        },
    )
    assert claimed.status_code == 201
    assert client.patch(
        f"/api/v1/books/{book['id']}",
        json={"number_mode": "none"},
    ).json()["claimed_number_count"] == 0


def test_book_settings_invitation_and_data_management(client: TestClient) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Settings Book",
            "owner_name": "Editor",
            "number_mode": "automatic",
        },
    ).json()
    book_id = book["id"]
    old_invite_code = book["invite_code"]

    updated = client.patch(
        f"/api/v1/books/{book_id}",
        json={
            "subtitle": "Volume One",
            "school": "Open School",
            "publisher": "Class Press",
            "description": "Settings description",
            "submission_enabled": False,
            "allow_multiple_articles": False,
            "allow_edit_after_submit": False,
            "allow_delete_article": False,
            "invite_enabled": True,
            "number_prefix": "A-",
            "number_digits": 3,
        },
    )
    assert updated.status_code == 200
    settings = updated.json()
    assert settings["subtitle"] == "Volume One"
    assert settings["school"] == "Open School"
    assert settings["publisher"] == "Class Press"
    assert settings["submission_enabled"] is False
    assert settings["allow_multiple_articles"] is False
    assert settings["allow_edit_after_submit"] is False
    assert settings["allow_delete_article"] is False
    assert settings["number_prefix"] == "A-"
    assert settings["number_digits"] == 3

    stopped = client.post(
        f"/api/v1/join/{old_invite_code}",
        json={"name": "Avery"},
    )
    assert stopped.status_code == 409
    assert stopped.json()["detail"]["code"] == "submission_disabled"
    assert stopped.json()["detail"]["message_zh"] == "当前书籍已停止接收投稿。"

    disabled = client.patch(
        f"/api/v1/books/{book_id}",
        json={"invite_enabled": False},
    ).json()
    assert disabled["invite_enabled"] is False
    unavailable = client.get(f"/api/v1/join/{old_invite_code}")
    assert unavailable.status_code == 403
    assert unavailable.json()["detail"]["code"] == "invite_disabled"
    assert unavailable.json()["detail"]["message_zh"] == (
        "当前书籍暂不接受新的作者加入。"
    )

    regenerated = client.post(f"/api/v1/books/{book_id}/invite-code")
    assert regenerated.status_code == 200
    new_invite_code = regenerated.json()["invite_code"]
    assert new_invite_code != old_invite_code
    assert client.get(f"/api/v1/join/{old_invite_code}").status_code == 404

    client.patch(
        f"/api/v1/books/{book_id}",
        json={
            "invite_enabled": True,
            "submission_enabled": True,
            "allow_multiple_articles": True,
        },
    )
    author = client.post(
        f"/api/v1/books/{book_id}/authors",
        json={"name": "Avery"},
    ).json()
    for title, status_value in (("Draft", "draft"), ("Approved", "approved")):
        response = client.post(
            f"/api/v1/books/{book_id}/articles",
            json={
                "author_id": author["id"],
                "number": title,
                "title": title,
                "status": status_value,
            },
        )
        assert response.status_code == 201

    stats = client.get(f"/api/v1/books/{book_id}").json()
    assert stats["author_count"] == 1
    assert stats["article_count"] == 2
    assert stats["approved_article_count"] == 1
    assert stats["claimed_number_count"] == 0

    drafts_deleted = client.delete(f"/api/v1/books/{book_id}/drafts").json()
    assert drafts_deleted["article_count"] == 1
    assert drafts_deleted["approved_article_count"] == 1
    articles_deleted = client.delete(f"/api/v1/books/{book_id}/articles").json()
    assert articles_deleted["article_count"] == 0
    authors_deleted = client.delete(f"/api/v1/books/{book_id}/authors").json()
    assert authors_deleted["author_count"] == 0


def test_automatic_numbering_assigns_prefix_and_digits(client: TestClient) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Automatic Numbering",
            "owner_name": "Editor",
            "number_mode": "automatic",
            "number_prefix": "NO-",
            "number_digits": 3,
        },
    ).json()
    author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Avery"},
    ).json()

    article_ids = []
    for title in ("First", "Second"):
        article = client.post(
            f"/api/v1/books/{book['id']}/articles",
            json={
                "author_id": author["id"],
                "title": title,
                "status": "approved",
            },
        )
        assert article.status_code == 201
        assert article.json()["number"] == ""
        article_ids.append(article.json()["id"])

    arranged = client.patch(
        f"/api/v1/books/{book['id']}/articles/order",
        json={"article_ids": list(reversed(article_ids))},
    )
    assert arranged.status_code == 200
    assert [article["number"] for article in arranged.json()] == [
        "NO-001",
        "NO-002",
    ]


def test_existing_number_claim_mode_keeps_known_number_unique(
    client: TestClient,
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Existing Numbers",
            "owner_name": "Editor",
            "number_mode": "existing",
            "existing_number_mode": "claim",
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

    claimed = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": first_author["id"],
            "number": "CLASS-17",
            "title": "First",
        },
    )
    assert claimed.status_code == 201
    assert claimed.json()["number"] == "CLASS-17"

    duplicate = client.post(
        f"/api/v1/books/{book['id']}/articles",
        json={
            "author_id": second_author["id"],
            "number": "CLASS-17",
            "title": "Second",
        },
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"]["code"] == "article_number_already_claimed"


def test_submission_rules_limit_editing_and_deadline(client: TestClient) -> None:
    future_deadline = datetime.now(UTC) + timedelta(days=7)
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Submission Rules",
            "owner_name": "Editor",
        },
    ).json()
    book_id = book["id"]
    configured = client.patch(
        f"/api/v1/books/{book_id}",
        json={
            "submission_deadline": future_deadline.isoformat(),
            "allow_multiple_articles": True,
            "limit_articles_per_author": True,
            "max_articles_per_author": 2,
            "allow_edit_after_submit": False,
            "allow_delete_article": False,
            "number_mode": "existing",
            "existing_number_mode": "import",
        },
    )
    assert configured.status_code == 200
    rules = configured.json()
    assert rules["submission_deadline"] == future_deadline.isoformat().replace(
        "+00:00", "Z"
    )
    assert rules["max_articles_per_author"] == 2
    assert rules["number_mode"] == "existing"
    assert rules["number_pool"] == []

    author = client.post(
        f"/api/v1/books/{book_id}/authors",
        json={"name": "Avery"},
    ).json()
    missing_number = client.post(
        f"/api/v1/books/{book_id}/articles",
        json={"author_id": author["id"], "title": "Needs a number"},
    )
    assert missing_number.status_code == 409
    assert missing_number.json()["detail"]["code"] == "article_number_required"

    client.patch(
        f"/api/v1/books/{book_id}",
        json={"number_mode": "automatic"},
    )
    draft = client.post(
        f"/api/v1/books/{book_id}/articles",
        json={"author_id": author["id"], "title": "Draft"},
    ).json()
    submitted = client.post(
        f"/api/v1/books/{book_id}/articles",
        json={
            "author_id": author["id"],
            "title": "Submitted",
            "status": "pending",
        },
    ).json()

    over_limit = client.post(
        f"/api/v1/books/{book_id}/articles",
        json={"author_id": author["id"], "title": "Too many"},
    )
    assert over_limit.status_code == 409
    assert over_limit.json()["detail"]["code"] == "article_limit_reached"

    unlimited = client.patch(
        f"/api/v1/books/{book_id}",
        json={"limit_articles_per_author": False},
    )
    assert unlimited.status_code == 200
    assert unlimited.json()["limit_articles_per_author"] is False
    third = client.post(
        f"/api/v1/books/{book_id}/articles",
        json={"author_id": author["id"], "title": "Allowed without a limit"},
    )
    assert third.status_code == 201

    locked = client.patch(
        f"/api/v1/articles/{submitted['id']}",
        json={"title": "Changed"},
    )
    assert locked.status_code == 409
    assert locked.json()["detail"]["code"] == "article_submission_locked"

    past_deadline = datetime.now(UTC) - timedelta(days=1)
    client.patch(
        f"/api/v1/books/{book_id}",
        json={"submission_deadline": past_deadline.isoformat()},
    )
    expired = client.patch(
        f"/api/v1/articles/{draft['id']}",
        json={"title": "Too late"},
    )
    assert expired.status_code == 409
    assert expired.json()["detail"]["code"] == "submission_deadline_passed"


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
            "number_mode": "existing",
            "existing_number_mode": "import",
            "number_pool": ["001", "002", "003"],
        },
    ).json()
    author = client.post(
        f"/api/v1/books/{book['id']}/authors",
        json={"name": "Avery"},
    ).json()
    collection = f"/api/v1/books/{book['id']}/articles"

    unavailable = client.post(
        collection,
        json={
            "author_id": author["id"],
            "number": "999",
            "title": "Outside the pool",
        },
    )
    assert unavailable.status_code == 409
    assert unavailable.json()["detail"]["code"] == "article_number_not_available"

    create_response = client.post(
        collection,
        json={
            "author_id": author["id"],
            "number": "001",
            "title": "A real draft",
            "subtitle": "A persisted subtitle",
            "content": "Stored in SQLite",
            "image": "https://example.com/image.jpg",
            "image_settings": {
                "page": 0,
                "wrap": "square",
                "position": {"x": 42, "y": 36},
                "size": {"width": 48, "height": 28},
            },
            "status": "draft",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["book_id"] == book["id"]
    assert created["status"] == "draft"
    assert created["subtitle"] == "A persisted subtitle"
    assert created["submitted_at"] is None
    assert created["image"] == "https://example.com/image.jpg"
    assert created["image_settings"]["wrap"] == "square"
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
    unavailable_request = client.post(
        f"/api/v1/articles/{created['id']}/edit-request"
    )
    assert unavailable_request.status_code == 409
    assert (
        unavailable_request.json()["detail"]["code"]
        == "article_edit_request_unavailable"
    )

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

    edit_request = client.post(
        f"/api/v1/articles/{created['id']}/edit-request"
    )
    assert edit_request.status_code == 200
    assert edit_request.json()["status"] == "approved"
    assert edit_request.json()["edit_requested_at"] is not None
    duplicate_request = client.post(
        f"/api/v1/articles/{created['id']}/edit-request"
    )
    assert duplicate_request.status_code == 409
    assert (
        duplicate_request.json()["detail"]["code"]
        == "article_edit_request_pending"
    )

    rejected_request = client.patch(
        f"/api/v1/articles/{created['id']}/edit-request",
        json={"action": "reject"},
    )
    assert rejected_request.status_code == 200
    assert rejected_request.json()["status"] == "approved"
    assert rejected_request.json()["edit_requested_at"] is None

    client.post(f"/api/v1/articles/{created['id']}/edit-request")
    approved_request = client.patch(
        f"/api/v1/articles/{created['id']}/edit-request",
        json={"action": "approve"},
    )
    assert approved_request.status_code == 200
    assert approved_request.json()["status"] == "draft"
    assert approved_request.json()["submitted_at"] is None
    assert approved_request.json()["edit_requested_at"] is None
    assert client.get(
        collection,
        params={"include_drafts": "false"},
    ).json() == []

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


def test_join_requires_identity_confirmation_for_every_existing_name(
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
    confirmation = client.post(join_path, json={"name": "张三"}).json()
    assert confirmation == {"mode": "selection_required", "author_id": None}

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
            "number_mode": "existing",
            "existing_number_mode": "import",
            "number_pool": ["003", "017"],
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


def test_layout_assigns_book_wide_numbers_only_for_automatic_numbering(
    client: TestClient,
) -> None:
    book = client.post(
        "/api/v1/books",
        json={
            "title": "Layout Numbering",
            "owner_name": "Editor",
            "number_mode": "automatic",
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

    no_number_book = client.post(
        "/api/v1/books",
        json={
            "title": "Claim Numbering",
            "owner_name": "Editor",
            "number_mode": "none",
        },
    ).json()
    assert (
        client.patch(
            f"/api/v1/books/{no_number_book['id']}/articles/numbers",
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
            "number_mode": "existing",
            "existing_number_mode": "import",
            "number_pool": ["010", "020"],
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
            "number_mode": "existing",
            "existing_number_mode": "import",
            "number_pool": ["2", "10"],
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
                "subtitle": f"Printable subtitle {number}",
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
    rendered_text = "\n".join(
        page.extract_text() or "" for page in PdfReader(artifact).pages
    )
    assert "Printable subtitle 2" in rendered_text
    assert "Printable subtitle 10" in rendered_text

    download = client.get(result["download_url"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"
    assert download.content.startswith(b"%PDF")
    assert (
        client.get(f"/api/v1/books/{book_id}/export/not-a-task/download").status_code
        == 404
    )
