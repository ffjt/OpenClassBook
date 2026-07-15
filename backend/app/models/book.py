from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.db.database import Base
from app.models.author import Author


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_name: Mapped[str] = mapped_column(String(120))
    invite_code: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    number_mode: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="collecting")
    cover_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    preface_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    afterword_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    acknowledgement_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    back_cover_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    layout_sections: Mapped[list[dict[str, object]] | None] = mapped_column(
        JSON, nullable=True
    )
    layout_article_order: Mapped[list[int] | None] = mapped_column(
        JSON, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    author_count: Mapped[int] = column_property(
        select(func.count(Author.id))
        .where(Author.book_id == id)
        .correlate_except(Author)
        .scalar_subquery()
    )
