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
    _upgrade_author_identity_model()
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
        if "status" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE books ADD COLUMN status VARCHAR(20) "
                "NOT NULL DEFAULT 'collecting'"
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
        author_columns == expected_author_columns
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
                    (id, uuid, book_id, name, created_at, updated_at)
                SELECT id, {author_uuid}, book_id, name,
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
