from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.db.database import Base
from app.models.article import Article
from app.models.author import Author


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_name: Mapped[str] = mapped_column(String(120))
    school: Mapped[str | None] = mapped_column(String(255), nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(255), nullable=True)
    appearance_metadata: Mapped[dict[str, str] | None] = mapped_column(
        JSON, nullable=True
    )
    invite_code: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    invite_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    submission_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    submission_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    allow_multiple_articles: Mapped[bool] = mapped_column(Boolean, default=True)
    limit_articles_per_author: Mapped[bool] = mapped_column(Boolean, default=True)
    max_articles_per_author: Mapped[int] = mapped_column(Integer, default=5)
    allow_edit_after_submit: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_delete_article: Mapped[bool] = mapped_column(Boolean, default=True)
    class_collection_mode: Mapped[str] = mapped_column(
        String(20), default="none", server_default="none"
    )
    class_fixed_value: Mapped[str | None] = mapped_column(String(120), nullable=True)
    class_name_template: Mapped[str | None] = mapped_column(String(120), nullable=True)
    class_value_style: Mapped[str | None] = mapped_column(String(20), nullable=True)
    number_mode: Mapped[str] = mapped_column(String(20))
    claim_number_start: Mapped[int] = mapped_column(
        Integer, default=1, server_default="1"
    )
    claim_number_end: Mapped[int] = mapped_column(
        Integer, default=100, server_default="100"
    )
    number_prefix: Mapped[str] = mapped_column(String(20), default="")
    number_digits: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[str] = mapped_column(String(20), default="collecting")
    setup_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    cover_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    preface_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    afterword_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    acknowledgement_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    back_cover_file: Mapped[str | None] = mapped_column(Text, nullable=True)
    layout_sections: Mapped[list[dict[str, object]] | None] = mapped_column(
        JSON, nullable=True
    )
    layout_article_order: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)
    layout_article_page_mode: Mapped[str] = mapped_column(
        String(20), default="single", server_default="single"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    author_count: Mapped[int] = column_property(
        select(func.count(Author.id))
        .where(Author.book_id == id)
        .correlate_except(Author)
        .scalar_subquery()
    )
    article_count: Mapped[int] = column_property(
        select(func.count(Article.id))
        .where(Article.book_id == id)
        .correlate_except(Article)
        .scalar_subquery()
    )
    approved_article_count: Mapped[int] = column_property(
        select(func.count(Article.id))
        .where(Article.book_id == id, Article.status == "approved")
        .correlate_except(Article)
        .scalar_subquery()
    )
    claimed_number_count: Mapped[int] = column_property(
        select(func.count(Article.id))
        .where(Article.book_id == id, Article.number != "")
        .correlate_except(Article)
        .scalar_subquery()
    )
