from app.models.book import Book
from app.repositories.invite import InviteRepository


class InviteService:
    def __init__(self, repository: InviteRepository) -> None:
        self.repository = repository

    def get_book(self, book_id: int) -> Book | None:
        return self.repository.get_book(book_id)
