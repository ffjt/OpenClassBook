from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from app.models.author import Author
from app.models.book import Book
from app.repositories.join import JoinRepository
from app.schemas.invitation import JoinCreate


class JoinUnavailableError(ValueError):
    def __init__(self, code: Literal["invite_disabled", "submission_disabled"]) -> None:
        super().__init__(code)
        self.code = code


class JoinService:
    def __init__(self, repository: JoinRepository) -> None:
        self.repository = repository

    def get_book(self, invite_code: str) -> Book | None:
        book = self.repository.get_book_by_invite_code(invite_code.strip().upper())
        if book is not None and not book.invite_enabled:
            raise JoinUnavailableError("invite_disabled")
        return book

    def join(
        self,
        invite_code: str,
        data: JoinCreate,
    ) -> (
        tuple[
            Literal["created", "selection_required"],
            Author | None,
        ]
        | None
    ):
        book = self.get_book(invite_code)
        if book is None:
            return None
        if not book.submission_enabled:
            raise JoinUnavailableError("submission_disabled")
        matches = self.repository.find_authors(book.id, data.name)
        if matches:
            return "selection_required", None
        return (
            "created",
            self.repository.create_author(
                book,
                data.name,
                uuid4(),
                datetime.now(UTC),
            ),
        )

    def get_author(self, author_id: int) -> tuple[Author, Book] | None:
        return self.repository.get_author_with_book(author_id)
