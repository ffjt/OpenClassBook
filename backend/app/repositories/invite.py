from sqlalchemy.orm import Session

from app.models.book import Book


class InviteRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_book(self, book_id: int) -> Book | None:
        return self.session.get(Book, book_id)
