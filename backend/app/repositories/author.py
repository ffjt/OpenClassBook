from sqlalchemy import func, select

from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.repositories.base import BaseRepository
from app.schemas.author import AuthorCreateData, AuthorUpdateData


class AuthorRepository(BaseRepository[Author, AuthorCreateData, AuthorUpdateData]):
    model = Author

    def create(self, data: AuthorCreateData) -> Author:
        author = Author(**data.model_dump())
        self.session.add(author)
        self.session.commit()
        self.session.refresh(author)
        return author

    def get(self, resource_id: int) -> Author | None:
        return self.session.get(Author, resource_id)

    def list_by_book(self, book_id: int) -> list[Author]:
        statement = (
            select(Author)
            .where(Author.book_id == book_id)
            .order_by(Author.updated_at.desc(), Author.id.desc())
        )
        return list(self.session.scalars(statement))

    def search_by_name(self, book_id: int, name: str) -> list[Author]:
        statement = (
            select(Author)
            .where(Author.book_id == book_id, Author.name == name)
            .order_by(Author.updated_at.desc(), Author.id.desc())
        )
        return list(self.session.scalars(statement))

    def get_preview(self, author_id: int) -> tuple[int, Article | None] | None:
        if self.get(author_id) is None:
            return None
        articles = select(Article).where(Article.author_id == author_id)
        article_count = (
            self.session.scalar(
                select(func.count(Article.id)).where(Article.author_id == author_id)
            )
            or 0
        )
        latest = self.session.scalar(
            articles.order_by(Article.updated_at.desc(), Article.id.desc()).limit(1)
        )
        return article_count, latest

    def book_exists(self, book_id: int) -> bool:
        return self.session.get(Book, book_id) is not None

    def get_book(self, book_id: int) -> Book | None:
        return self.session.get(Book, book_id)

    def update(self, resource_id: int, data: AuthorUpdateData) -> Author | None:
        author = self.get(resource_id)
        if author is None:
            return None

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(author, field, value)

        self.session.commit()
        self.session.refresh(author)
        return author

    def delete(self, resource_id: int) -> bool:
        author = self.get(resource_id)
        if author is None:
            return False

        self.session.delete(author)
        self.session.commit()
        return True
