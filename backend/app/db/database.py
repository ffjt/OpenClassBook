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
    _upgrade_scaffold_content_tables()


def _upgrade_scaffold_book_table() -> None:
    """Upgrade the pre-CRUD empty scaffold table without manual SQL steps."""
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


def _upgrade_scaffold_content_tables() -> None:
    """Move the original read-only scaffold tables to the CRUD schema."""
    if not settings.database_url.startswith("sqlite"):
        return

    author_columns = {
        column["name"] for column in inspect(engine).get_columns("authors")
    }
    article_columns = {
        column["name"] for column in inspect(engine).get_columns("articles")
    }
    required_author_columns = {
        "id",
        "book_id",
        "number",
        "name",
        "status",
        "article_status",
        "joined_at",
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
        "created_at",
        "updated_at",
    }
    if (
        required_author_columns <= author_columns
        and required_article_columns <= article_columns
    ):
        return

    author_status_source = (
        "status" if "status" in author_columns else "join_status"
    )
    author_status = (
        f"CASE WHEN {author_status_source} = 'joined' THEN 'joined' "
        f"WHEN {author_status_source} = 'not_joined' THEN 'not_joined' "
        "ELSE 'invited' END"
    )
    article_status = (
        "article_status" if "article_status" in author_columns else "'not_started'"
    )
    if "joined_at" in author_columns:
        joined_at = "joined_at"
    elif "created_at" in author_columns:
        joined_at = f"CASE WHEN {author_status} = 'joined' THEN created_at END"
    else:
        joined_at = "NULL"
    author_updated_at = (
        "updated_at"
        if "updated_at" in author_columns
        else "created_at"
        if "created_at" in author_columns
        else "CURRENT_TIMESTAMP"
    )

    article_status_source = (
        "status" if "status" in article_columns else "review_status"
    )
    normalized_article_status = (
        f"CASE WHEN {article_status_source} IN "
        "('draft', 'pending', 'approved', 'rejected') "
        f"THEN {article_status_source} ELSE 'draft' END"
    )
    if "image" in article_columns:
        image = "image"
    elif "images" in article_columns:
        image = (
            "CASE WHEN json_valid(images) AND json_type(images) = 'array' "
            "AND json_array_length(images) > 0 THEN json_extract(images, '$[0]') "
            "ELSE NULL END"
        )
    else:
        image = "NULL"
    article_created_at = (
        "created_at" if "created_at" in article_columns else "CURRENT_TIMESTAMP"
    )
    article_updated_at = (
        "updated_at" if "updated_at" in article_columns else article_created_at
    )

    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        try:
            connection.exec_driver_sql("BEGIN")
            connection.exec_driver_sql("DROP TABLE IF EXISTS authors_crud")
            connection.exec_driver_sql("DROP TABLE IF EXISTS articles_crud")
            connection.exec_driver_sql(
                """
                CREATE TABLE authors_crud (
                    id INTEGER NOT NULL PRIMARY KEY,
                    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                    number VARCHAR(50) NOT NULL,
                    name VARCHAR(120) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    article_status VARCHAR(32) NOT NULL,
                    joined_at DATETIME,
                    updated_at DATETIME NOT NULL
                )
                """
            )
            connection.exec_driver_sql(
                """
                CREATE TABLE articles_crud (
                    id INTEGER NOT NULL PRIMARY KEY,
                    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                    author_id INTEGER NOT NULL
                        REFERENCES authors_crud(id) ON DELETE CASCADE,
                    number VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    image TEXT,
                    status VARCHAR(32) NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """
            )
            connection.exec_driver_sql(
                f"""
                INSERT INTO authors_crud
                    (id, book_id, number, name, status, article_status,
                     joined_at, updated_at)
                SELECT id, book_id, number, name, {author_status}, {article_status},
                       {joined_at}, COALESCE({author_updated_at}, CURRENT_TIMESTAMP)
                FROM authors
                """
            )
            connection.exec_driver_sql(
                f"""
                INSERT INTO articles_crud
                    (id, book_id, author_id, number, title, content, image,
                     status, created_at, updated_at)
                SELECT id, book_id, author_id, number, title, content, {image},
                       {normalized_article_status},
                       COALESCE({article_created_at}, CURRENT_TIMESTAMP),
                       COALESCE({article_updated_at}, CURRENT_TIMESTAMP)
                FROM articles
                """
            )
            connection.exec_driver_sql("DROP TABLE articles")
            connection.exec_driver_sql("DROP TABLE authors")
            connection.exec_driver_sql("ALTER TABLE authors_crud RENAME TO authors")
            connection.exec_driver_sql("ALTER TABLE articles_crud RENAME TO articles")
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
