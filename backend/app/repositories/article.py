from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.repositories.base import BaseRepository
from app.schemas.article import ArticleCreateData, ArticleUpdateData


class ArticleRepository(BaseRepository[Article, ArticleCreateData, ArticleUpdateData]):
    model = Article

    def create(self, data: ArticleCreateData) -> Article:
        article = Article(**data.model_dump())
        self.session.add(article)
        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            raise ValueError("article_number_already_claimed") from error
        self.session.refresh(article)
        return article

    def get(self, resource_id: int) -> Article | None:
        return self.session.get(Article, resource_id)

    def list_by_book(
        self,
        book_id: int,
        *,
        include_drafts: bool = True,
    ) -> list[Article]:
        statement = select(Article).where(Article.book_id == book_id)
        if not include_drafts:
            statement = statement.where(Article.status != "draft").order_by(
                Article.submitted_at.desc(), Article.id.desc()
            )
        else:
            statement = statement.order_by(Article.updated_at.desc(), Article.id.desc())
        return list(self.session.scalars(statement))

    def list_by_author(self, author_id: int) -> list[Article]:
        statement = (
            select(Article)
            .where(Article.author_id == author_id)
            .order_by(Article.updated_at.desc(), Article.id.desc())
        )
        return list(self.session.scalars(statement))

    def count_by_author(self, author_id: int) -> int:
        statement = select(func.count(Article.id)).where(
            Article.author_id == author_id
        )
        return self.session.scalar(statement) or 0

    def author_exists(self, author_id: int) -> bool:
        return self.session.get(Author, author_id) is not None

    def book_exists(self, book_id: int) -> bool:
        return self.session.get(Book, book_id) is not None

    def get_book(self, book_id: int) -> Book | None:
        return self.session.get(Book, book_id)

    def number_exists(
        self,
        book_id: int,
        number: str,
        *,
        exclude_article_id: int | None = None,
    ) -> bool:
        statement = select(Article.id).where(
            Article.book_id == book_id,
            Article.number == number,
        )
        if exclude_article_id is not None:
            statement = statement.where(Article.id != exclude_article_id)
        return self.session.scalar(statement) is not None

    def list_assigned_numbers(self, book_id: int) -> list[str]:
        statement = select(Article.number).where(
            Article.book_id == book_id,
            Article.number != "",
        )
        return list(self.session.scalars(statement))

    def author_belongs_to_book(self, author_id: int, book_id: int) -> bool:
        statement = select(Author.id).where(
            Author.id == author_id,
            Author.book_id == book_id,
        )
        return self.session.scalar(statement) is not None

    def update(self, resource_id: int, data: ArticleUpdateData) -> Article | None:
        article = self.get(resource_id)
        if article is None:
            return None

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(article, field, value)

        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            raise ValueError("article_number_already_claimed") from error
        self.session.refresh(article)
        return article

    def delete(self, resource_id: int) -> bool:
        article = self.get(resource_id)
        if article is None:
            return False

        self.session.delete(article)
        self.session.commit()
        return True

    def save_number_assignments(
        self,
        book: Book,
        book_articles: list[Article],
        ordered_articles: list[Article],
    ) -> list[Article]:
        self.session.execute(
            update(Article)
            .where(Article.book_id == book_articles[0].book_id)
            .values(number="")
        )
        self.session.flush()
        for index, article in enumerate(ordered_articles, start=1):
            article.number = (
                f"{book.number_prefix}{index:0{book.number_digits}d}"
            )

        book.layout_article_order = [article.id for article in ordered_articles]
        book.updated_at = datetime.now(UTC)

        self.session.commit()
        for article in ordered_articles:
            self.session.refresh(article)
        return ordered_articles

    def save_layout_order(
        self,
        book: Book,
        ordered_articles: list[Article],
    ) -> list[Article]:
        book.layout_article_order = [article.id for article in ordered_articles]
        book.updated_at = datetime.now(UTC)

        self.session.commit()
        for article in ordered_articles:
            self.session.refresh(article)
        return ordered_articles
