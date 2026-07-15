from sqlalchemy import select

from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.repositories.base import BaseRepository
from app.schemas.article import ArticleCreateData, ArticleUpdateData


class ArticleRepository(
    BaseRepository[Article, ArticleCreateData, ArticleUpdateData]
):
    model = Article

    def create(self, data: ArticleCreateData) -> Article:
        article = Article(**data.model_dump())
        self.session.add(article)
        self.session.commit()
        self.session.refresh(article)
        self.sync_author_article_status(article.author_id)
        return article

    def get(self, resource_id: int) -> Article | None:
        return self.session.get(Article, resource_id)

    def list_by_book(self, book_id: int) -> list[Article]:
        statement = (
            select(Article)
            .where(Article.book_id == book_id)
            .order_by(Article.updated_at.desc(), Article.id.desc())
        )
        return list(self.session.scalars(statement))

    def book_exists(self, book_id: int) -> bool:
        return self.session.get(Book, book_id) is not None

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

        previous_author_id = article.author_id
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(article, field, value)

        self.session.commit()
        self.session.refresh(article)
        self.sync_author_article_status(previous_author_id)
        if article.author_id != previous_author_id:
            self.sync_author_article_status(article.author_id)
        return article

    def delete(self, resource_id: int) -> bool:
        article = self.get(resource_id)
        if article is None:
            return False

        author_id = article.author_id
        self.session.delete(article)
        self.session.commit()
        self.sync_author_article_status(author_id)
        return True

    def sync_author_article_status(self, author_id: int) -> None:
        author = self.session.get(Author, author_id)
        if author is None:
            return

        statuses = list(
            self.session.scalars(
                select(Article.status).where(Article.author_id == author_id)
            )
        )
        author.article_status = (
            "submitted"
            if any(status != "draft" for status in statuses)
            else "draft"
            if statuses
            else "not_started"
        )
        self.session.commit()
