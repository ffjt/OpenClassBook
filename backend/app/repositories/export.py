from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.models.template import Template


@dataclass(frozen=True)
class ExportBundle:
    book: Book
    template: Template | None
    authors: list[Author]
    articles: list[Article]


class ExportRepository:
    """Read-only aggregate used by the export pipeline."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_bundle(self, book_id: int) -> ExportBundle | None:
        book = self.session.get(Book, book_id)
        if book is None:
            return None

        template = self.session.scalar(
            select(Template).where(Template.book_id == book_id)
        )
        authors = list(
            self.session.scalars(
                select(Author).where(Author.book_id == book_id).order_by(Author.id)
            )
        )
        articles = list(
            self.session.scalars(
                select(Article)
                .where(
                    Article.book_id == book_id,
                    Article.status == "approved",
                )
                .order_by(Article.id)
            )
        )
        return ExportBundle(
            book=book,
            template=template,
            authors=authors,
            articles=articles,
        )
