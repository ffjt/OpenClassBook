from collections.abc import Generator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {},
)

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
