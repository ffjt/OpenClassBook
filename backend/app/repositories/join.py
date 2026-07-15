from datetime import datetime

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

    def create_author(self, book: Book, name: str, joined_at: datetime) -> Author:
        author = Author(
            book_id=book.id,
            name=name,
            number=self._next_author_number(book.id),
            status="joined",
            article_status="not_started",
            joined_at=joined_at,
            updated_at=joined_at,
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

    def _next_author_number(self, book_id: int) -> str:
        statement = select(Author.number).where(Author.book_id == book_id)
        numeric_numbers = [
            int(number)
            for number in self.session.scalars(statement)
            if number.isdigit()
        ]
        return f"{max(numeric_numbers, default=0) + 1:03d}"
