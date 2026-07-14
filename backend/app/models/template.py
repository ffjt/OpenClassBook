from typing import Any

from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), unique=True, index=True
    )
    title_format: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    body_format: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    image_rules: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    numbering_rules: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    page_rules: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
