import json
import sqlite3
from collections.abc import Generator

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {},
)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection: object, _: object) -> None:
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _upgrade_scaffold_book_table()
    _repair_legacy_layout_sections()
    _normalize_layout_section_options()
    _upgrade_author_identity_model()
    _upgrade_author_class_field()
    _upgrade_article_content_fields()
    _ensure_article_number_uniqueness()


def _upgrade_scaffold_book_table() -> None:
    """Upgrade the pre-CRUD book table without manual SQL steps."""
    if not settings.database_url.startswith("sqlite"):
        return

    columns = {column["name"] for column in inspect(engine).get_columns("books")}
    with engine.begin() as connection:
        if "owner" in columns and "owner_name" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books RENAME COLUMN owner TO owner_name"
            )
        if "number_mode" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN number_mode VARCHAR(20) "
                "NOT NULL DEFAULT 'none'"
            )
        if "existing_number_mode" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN existing_number_mode VARCHAR(20)"
            )
            connection.exec_driver_sql(
                "UPDATE books SET existing_number_mode = CASE "
                "WHEN number_mode = 'import' THEN 'import' "
                "WHEN number_mode = 'automatic' THEN 'claim' "
                "ELSE NULL END"
            )
            connection.exec_driver_sql(
                "UPDATE books SET number_mode = CASE "
                "WHEN number_mode = 'none' THEN 'automatic' "
                "WHEN number_mode IN ('automatic', 'import') THEN 'existing' "
                "ELSE number_mode END"
            )
        if "number_pool" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN number_pool JSON NOT NULL DEFAULT '[]'"
            )
        if "status" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN status VARCHAR(20) "
                "NOT NULL DEFAULT 'collecting'"
            )
        if "setup_completed" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN setup_completed BOOLEAN "
                "NOT NULL DEFAULT 0"
            )
        if "class_collection_mode" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN class_collection_mode VARCHAR(20) "
                "NOT NULL DEFAULT 'none'"
            )
        if "class_fixed_value" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN class_fixed_value VARCHAR(120)"
            )
        if "class_name_template" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN class_name_template VARCHAR(120)"
            )
        if "class_value_style" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN class_value_style VARCHAR(20)"
            )
            connection.exec_driver_sql(
                "UPDATE books SET class_value_style = 'arabic' "
                "WHERE class_collection_mode = 'template'"
            )
        if "submission_deadline" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN submission_deadline DATETIME"
            )
        if "max_articles_per_author" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN max_articles_per_author INTEGER "
                "NOT NULL DEFAULT 5"
            )
        if "limit_articles_per_author" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN limit_articles_per_author BOOLEAN "
                "NOT NULL DEFAULT 1"
            )
        optional_text_columns = ("subtitle", "school", "publisher")
        for column in optional_text_columns:
            if column not in columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE books ADD COLUMN {column} VARCHAR(255)"
                )
        if "appearance_metadata" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN appearance_metadata JSON"
            )
        boolean_columns = (
            "invite_enabled",
            "submission_enabled",
            "allow_multiple_articles",
            "allow_edit_after_submit",
            "allow_delete_article",
        )
        for column in boolean_columns:
            if column not in columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE books ADD COLUMN {column} BOOLEAN NOT NULL DEFAULT 1"
                )
        if "number_prefix" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN number_prefix VARCHAR(20) "
                "NOT NULL DEFAULT ''"
            )
        if "number_digits" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN number_digits INTEGER NOT NULL DEFAULT 3"
            )
        for column in (
            "cover_file",
            "preface_file",
            "afterword_file",
            "acknowledgement_file",
            "back_cover_file",
        ):
            if column not in columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE books ADD COLUMN {column} TEXT"
                )
        if "layout_sections" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN layout_sections JSON"
            )
        if "layout_article_order" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN layout_article_order JSON"
            )
        if "layout_article_page_mode" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN layout_article_page_mode VARCHAR(20) "
                "NOT NULL DEFAULT 'single'"
            )


def _repair_legacy_layout_sections() -> None:
    """Make saved layouts created before fixed covers compatible with the contract."""
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        rows = connection.exec_driver_sql(
            "SELECT id, cover_file, back_cover_file, layout_sections FROM books "
            "WHERE layout_sections IS NOT NULL"
        ).fetchall()
        for book_id, cover_file, back_cover_file, raw_sections in rows:
            try:
                sections = (
                    json.loads(raw_sections)
                    if isinstance(raw_sections, str)
                    else raw_sections
                )
            except (TypeError, json.JSONDecodeError):
                continue
            if not isinstance(sections, list):
                continue

            cover_sections = [
                section
                for section in sections
                if isinstance(section, dict) and section.get("preset") == "cover"
            ]
            back_cover_sections = [
                section
                for section in sections
                if isinstance(section, dict) and section.get("preset") == "back_cover"
            ]
            if len(cover_sections) == 1 and len(back_cover_sections) == 1:
                continue

            regular_sections = [
                section
                for section in sections
                if not isinstance(section, dict)
                or section.get("preset") not in {"cover", "back_cover"}
            ]
            cover_source = cover_sections[0] if cover_sections else {}
            back_cover_source = back_cover_sections[0] if back_cover_sections else {}
            normalized_sections = [
                {
                    "id": "cover",
                    "kind": "page",
                    "preset": "cover",
                    "name": None,
                    "file": cover_source.get("file") or cover_file,
                },
                *regular_sections,
                {
                    "id": "back_cover",
                    "kind": "page",
                    "preset": "back_cover",
                    "name": None,
                    "file": back_cover_source.get("file") or back_cover_file,
                },
            ]
            connection.exec_driver_sql(
                "UPDATE books SET layout_sections = ? WHERE id = ?",
                (json.dumps(normalized_sections, ensure_ascii=False), book_id),
            )


def _normalize_layout_section_options() -> None:
    """Upgrade old chapter blocks and give every saved section visibility defaults."""
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        rows = connection.exec_driver_sql(
            "SELECT id, layout_sections FROM books WHERE layout_sections IS NOT NULL"
        ).fetchall()
        for book_id, raw_sections in rows:
            try:
                sections = (
                    json.loads(raw_sections)
                    if isinstance(raw_sections, str)
                    else raw_sections
                )
            except (TypeError, json.JSONDecodeError):
                continue
            if not isinstance(sections, list):
                continue

            changed = False
            normalized: list[object] = []
            for raw_section in sections:
                if not isinstance(raw_section, dict):
                    normalized.append(raw_section)
                    continue
                section = dict(raw_section)
                if section.get("preset") == "chapter":
                    section["preset"] = "contents"
                    changed = True
                if "hidden" not in section:
                    section["hidden"] = False
                    changed = True
                if section.get("preset") == "contents":
                    if "show_author" not in section:
                        section["show_author"] = True
                        changed = True
                    if "show_class" not in section:
                        section["show_class"] = False
                        changed = True
                normalized.append(section)
            if changed:
                connection.exec_driver_sql(
                    "UPDATE books SET layout_sections = ? WHERE id = ?",
                    (json.dumps(normalized, ensure_ascii=False), book_id),
                )


def _column_expression(columns: set[str], *candidates: str, fallback: str) -> str:
    return next((column for column in candidates if column in columns), fallback)


def _upgrade_author_identity_model() -> None:
    """Rebuild legacy content tables around Author 1:N Article."""
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    author_columns = {column["name"] for column in inspector.get_columns("authors")}
    article_columns = {column["name"] for column in inspector.get_columns("articles")}
    expected_author_columns = {
        "id",
        "uuid",
        "book_id",
        "name",
        "created_at",
        "updated_at",
    }
    required_article_columns = {
        "id",
        "book_id",
        "author_id",
        "number",
        "title",
        "content",
        "image",
        "status",
        "submitted_at",
        "created_at",
        "updated_at",
    }
    if (
        expected_author_columns <= author_columns
        and required_article_columns <= article_columns
    ):
        return

    author_uuid = (
        "replace(uuid, '-', '')"
        if "uuid" in author_columns
        else "lower(hex(randomblob(16)))"
    )
    author_created_at = _column_expression(
        author_columns,
        "created_at",
        "joined_at",
        "updated_at",
        fallback="CURRENT_TIMESTAMP",
    )
    author_updated_at = _column_expression(
        author_columns,
        "updated_at",
        "created_at",
        "joined_at",
        fallback="CURRENT_TIMESTAMP",
    )
    article_author_id = _column_expression(
        article_columns,
        "author_id",
        fallback=(
            "(SELECT id FROM authors WHERE authors.article_id = articles.id LIMIT 1)"
            if "article_id" in author_columns
            else "NULL"
        ),
    )
    article_book_id = _column_expression(
        article_columns,
        "book_id",
        fallback=(
            f"(SELECT book_id FROM authors WHERE authors.id = {article_author_id})"
        ),
    )
    article_number = _column_expression(
        article_columns, "number", fallback="printf('%03d', id)"
    )
    article_title = _column_expression(article_columns, "title", fallback="'Untitled'")
    article_content = _column_expression(article_columns, "content", fallback="''")
    article_image = _column_expression(article_columns, "image", fallback="NULL")
    article_status_source = _column_expression(
        article_columns, "status", "review_status", fallback="'draft'"
    )
    article_status = (
        f"CASE WHEN {article_status_source} IN "
        "('draft', 'pending', 'approved', 'rejected') "
        f"THEN {article_status_source} ELSE 'draft' END"
    )
    article_created_at = _column_expression(
        article_columns, "created_at", fallback="CURRENT_TIMESTAMP"
    )
    article_updated_at = _column_expression(
        article_columns, "updated_at", "created_at", fallback="CURRENT_TIMESTAMP"
    )
    author_class_name = _column_expression(
        author_columns, "class_name", fallback="NULL"
    )
    article_submitted_at = _column_expression(
        article_columns,
        "submitted_at",
        fallback=(
            f"CASE WHEN {article_status_source} != 'draft' "
            f"THEN {article_updated_at} ELSE NULL END"
        ),
    )

    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        try:
            connection.exec_driver_sql("BEGIN")
            connection.exec_driver_sql("DROP TABLE IF EXISTS authors_identity")
            connection.exec_driver_sql("DROP TABLE IF EXISTS articles_identity")
            connection.exec_driver_sql(
                """
                CREATE TABLE authors_identity (
                    id INTEGER NOT NULL PRIMARY KEY,
                    uuid CHAR(32) NOT NULL UNIQUE,
                    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                    name VARCHAR(120) NOT NULL,
                    class_name VARCHAR(120),
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
            connection.exec_driver_sql(
                """
                CREATE TABLE articles_identity (
                    id INTEGER NOT NULL PRIMARY KEY,
                    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                    author_id INTEGER NOT NULL
                        REFERENCES authors_identity(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    image TEXT,
                    number VARCHAR(50) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    submitted_at DATETIME,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
            connection.exec_driver_sql(
                f"""
                INSERT INTO authors_identity
                    (id, uuid, book_id, name, class_name, created_at, updated_at)
                SELECT id, {author_uuid}, book_id, name,
                       {author_class_name},
                       COALESCE({author_created_at}, CURRENT_TIMESTAMP),
                       COALESCE({author_updated_at}, CURRENT_TIMESTAMP)
                FROM authors
                """
            )
            connection.exec_driver_sql(
                f"""
                INSERT INTO articles_identity
                    (id, book_id, author_id, title, content, image, number,
                     status, submitted_at, created_at, updated_at)
                SELECT id, {article_book_id}, {article_author_id}, {article_title},
                       {article_content}, {article_image}, {article_number},
                       {article_status}, {article_submitted_at},
                       COALESCE({article_created_at}, CURRENT_TIMESTAMP),
                       COALESCE({article_updated_at}, CURRENT_TIMESTAMP)
                FROM articles
                WHERE {article_author_id} IS NOT NULL
                """
            )
            connection.exec_driver_sql("DROP TABLE articles")
            connection.exec_driver_sql("DROP TABLE authors")
            connection.exec_driver_sql("ALTER TABLE authors_identity RENAME TO authors")
            connection.exec_driver_sql(
                "ALTER TABLE articles_identity RENAME TO articles"
            )
            connection.exec_driver_sql(
                "CREATE UNIQUE INDEX ix_authors_uuid ON authors (uuid)"
            )
            connection.exec_driver_sql(
                "CREATE INDEX ix_authors_book_id ON authors (book_id)"
            )
            connection.exec_driver_sql(
                "CREATE INDEX ix_articles_book_id ON articles (book_id)"
            )
            connection.exec_driver_sql(
                "CREATE INDEX ix_articles_author_id ON articles (author_id)"
            )
            connection.exec_driver_sql("COMMIT")
        except Exception:
            connection.exec_driver_sql("ROLLBACK")
            raise
        finally:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")


def _upgrade_article_content_fields() -> None:
    """Add content fields introduced after the Author 1:N migration."""
    if not settings.database_url.startswith("sqlite"):
        return

    columns = {column["name"] for column in inspect(engine).get_columns("articles")}
    if "subtitle" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE articles ADD COLUMN subtitle VARCHAR(255) "
                "NOT NULL DEFAULT ''"
            )
    if "image_settings" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE articles ADD COLUMN image_settings JSON"
            )
    if "edit_requested_at" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE articles ADD COLUMN edit_requested_at DATETIME"
            )


def _upgrade_author_class_field() -> None:
    """Add the optional resolved class name without rebuilding author content."""
    if not settings.database_url.startswith("sqlite"):
        return
    columns = {column["name"] for column in inspect(engine).get_columns("authors")}
    if "class_name" not in columns:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                "ALTER TABLE authors ADD COLUMN class_name VARCHAR(120)"
            )


def _ensure_article_number_uniqueness() -> None:
    """Keep claimed article numbers unique within each book."""
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            UPDATE articles
            SET number = ''
            WHERE number <> ''
              AND EXISTS (
                  SELECT 1
                  FROM articles AS earlier
                  WHERE earlier.book_id = articles.book_id
                    AND earlier.number = articles.number
                    AND earlier.id < articles.id
              )
            """
        )
        connection.exec_driver_sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_articles_book_number_assigned
            ON articles (book_id, number)
            WHERE number <> ''
            """
        )
