from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.author import Author


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = (
        Index(
            "uq_articles_book_number_assigned",
            "book_id",
            "number",
            unique=True,
            sqlite_where=text("number <> ''"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    book_id: Mapped[int] = mapped_column(
        ForeignKey("books.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[int] = mapped_column(
        ForeignKey("authors.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    subtitle: Mapped[str] = mapped_column(String(255), default="")
    content: Mapped[str] = mapped_column(Text)
    image: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_settings: Mapped[dict[str, object] | None] = mapped_column(
        JSON, nullable=True
    )
    number: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(32), default="draft")
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    edit_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    author: Mapped["Author"] = relationship(back_populates="articles")
