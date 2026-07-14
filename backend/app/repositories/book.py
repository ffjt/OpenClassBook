from sqlalchemy import select

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
