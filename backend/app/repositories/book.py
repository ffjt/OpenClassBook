from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.sql.dml import Delete

from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.repositories.base import BaseRepository
from app.schemas.book import BookCreateData, BookUpdateData


class BookRepository(BaseRepository[Book, BookCreateData, BookUpdateData]):
    model = Book

    def create(self, data: BookCreateData) -> Book:
        book = Book(**data.model_dump())
        self.session.add(book)
        self.session.commit()
        self.session.refresh(book)
        return book

    def get(self, resource_id: int) -> Book | None:
        return self.session.get(Book, resource_id)

    def get_by_invite_code(self, invite_code: str) -> Book | None:
        statement = select(Book).where(Book.invite_code == invite_code)
        return self.session.scalar(statement)

    def list(self, *, offset: int = 0, limit: int = 100) -> list[Book]:
        statement = select(Book).order_by(Book.id).offset(offset).limit(limit)
        return list(self.session.scalars(statement))

    def update(self, resource_id: int, data: BookUpdateData) -> Book | None:
        book = self.get(resource_id)
        if book is None:
            return None

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(book, field, value)

        self.session.commit()
        self.session.refresh(book)
        return book

    def delete(self, resource_id: int) -> bool:
        book = self.get(resource_id)
        if book is None:
            return False

        self.session.delete(book)
        self.session.commit()
        return True

    def clear_article_numbers(self, resource_id: int) -> Book | None:
        book = self.get(resource_id)
        if book is None:
            return None
        self.session.execute(
            update(Article)
            .where(Article.book_id == resource_id, Article.number != "")
            .values(number="")
        )
        self.session.commit()
        self.session.refresh(book)
        return book

    def regenerate_invite_code(
        self,
        resource_id: int,
        invite_code: str,
        updated_at: datetime,
    ) -> Book | None:
        book = self.get(resource_id)
        if book is None:
            return None
        book.invite_code = invite_code
        book.updated_at = updated_at
        self.session.commit()
        self.session.refresh(book)
        return book

    def delete_drafts(self, resource_id: int, updated_at: datetime) -> Book | None:
        return self._delete_book_data(
            resource_id,
            delete(Article).where(
                Article.book_id == resource_id,
                Article.status == "draft",
            ),
            updated_at,
        )

    def delete_articles(self, resource_id: int, updated_at: datetime) -> Book | None:
        return self._delete_book_data(
            resource_id,
            delete(Article).where(Article.book_id == resource_id),
            updated_at,
            clear_layout_order=True,
        )

    def delete_authors(self, resource_id: int, updated_at: datetime) -> Book | None:
        return self._delete_book_data(
            resource_id,
            delete(Author).where(Author.book_id == resource_id),
            updated_at,
            clear_layout_order=True,
        )

    def _delete_book_data(
        self,
        resource_id: int,
        statement: Delete,
        updated_at: datetime,
        *,
        clear_layout_order: bool = False,
    ) -> Book | None:
        book = self.get(resource_id)
        if book is None:
            return None
        self.session.execute(statement)
        if clear_layout_order:
            book.layout_article_order = None
        book.updated_at = updated_at
        self.session.commit()
        self.session.refresh(book)
        return book
