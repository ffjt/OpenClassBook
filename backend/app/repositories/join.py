from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.author import Author
from app.models.book import Book


class JoinRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_book_by_invite_code(self, invite_code: str) -> Book | None:
        statement = select(Book).where(Book.invite_code == invite_code)
        return self.session.scalar(statement)

    def find_authors(self, book_id: int, name: str) -> list[Author]:
        statement = (
            select(Author)
            .where(Author.book_id == book_id, Author.name == name)
            .order_by(Author.updated_at.desc(), Author.id.desc())
        )
        return list(self.session.scalars(statement))

    def create_author(
        self,
        book: Book,
        name: str,
        author_uuid: UUID,
        now: datetime,
    ) -> Author:
        author = Author(
            book_id=book.id,
            name=name,
            uuid=author_uuid,
            created_at=now,
            updated_at=now,
        )
        self.session.add(author)
        self.session.commit()
        self.session.refresh(author)
        return author

    def get_author_with_book(self, author_id: int) -> tuple[Author, Book] | None:
        statement = (
            select(Author, Book)
            .join(Book, Book.id == Author.book_id)
            .where(Author.id == author_id)
        )
        return self.session.execute(statement).one_or_none()
