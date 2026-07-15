from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from app.models.author import Author
from app.models.book import Book
from app.repositories.join import JoinRepository
from app.schemas.invitation import JoinCreate


class JoinService:
    def __init__(self, repository: JoinRepository) -> None:
        self.repository = repository

    def get_book(self, invite_code: str) -> Book | None:
        return self.repository.get_book_by_invite_code(invite_code.strip().upper())

    def join(
        self,
        invite_code: str,
        data: JoinCreate,
    ) -> (
        tuple[
            Literal["created", "restored", "selection_required"],
            Author | None,
        ]
        | None
    ):
        book = self.get_book(invite_code)
        if book is None:
            return None
        matches = self.repository.find_authors(book.id, data.name)
        if len(matches) == 1:
            return "restored", matches[0]
        if len(matches) > 1:
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
