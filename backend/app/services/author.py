from datetime import UTC, datetime

from app.models.author import Author
from app.repositories.author import AuthorRepository
from app.schemas.author import (
    AuthorCreate,
    AuthorCreateData,
    AuthorUpdate,
    AuthorUpdateData,
)


class AuthorService:
    def __init__(self, repository: AuthorRepository) -> None:
        self.repository = repository

    def book_exists(self, book_id: int) -> bool:
        return self.repository.book_exists(book_id)

    def list_by_book(self, book_id: int) -> list[Author]:
        return self.repository.list_by_book(book_id)

    def get(self, author_id: int) -> Author | None:
        return self.repository.get(author_id)

    def create(self, book_id: int, data: AuthorCreate) -> Author:
        now = datetime.now(UTC)
        values = data.model_dump()
        values["joined_at"] = (
            values["joined_at"] or now if values["status"] == "joined" else None
        )
        return self.repository.create(
            AuthorCreateData(book_id=book_id, updated_at=now, **values)
        )

    def update(self, author_id: int, data: AuthorUpdate) -> Author | None:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("At least one field is required / 至少需要一个更新字段")

        author = self.repository.get(author_id)
        if author is None:
            return None

        if changes.get("status") == "joined" and not author.joined_at:
            changes.setdefault("joined_at", datetime.now(UTC))
        elif "status" in changes and changes["status"] != "joined":
            changes["joined_at"] = None

        return self.repository.update(
            author_id,
            AuthorUpdateData(**changes, updated_at=datetime.now(UTC)),
        )

    def delete(self, author_id: int) -> bool:
        return self.repository.delete(author_id)
