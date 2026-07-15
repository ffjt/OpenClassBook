import secrets
import string
from datetime import UTC, datetime

from app.models.book import Book
from app.repositories.book import BookRepository
from app.schemas.book import BookCreate, BookCreateData, BookUpdate, BookUpdateData

INVITE_CODE_ALPHABET = string.ascii_uppercase + string.digits


class BookService:
    def __init__(self, repository: BookRepository) -> None:
        self.repository = repository

    def create(self, data: BookCreate) -> Book:
        now = datetime.now(UTC)
        create_data = BookCreateData(
            **data.model_dump(),
            invite_code=self._create_invite_code(),
            created_at=now,
            updated_at=now,
        )
        return self.repository.create(create_data)

    def get(self, book_id: int) -> Book | None:
        return self.repository.get(book_id)

    def list(self, *, offset: int = 0, limit: int = 100) -> list[Book]:
        return self.repository.list(offset=offset, limit=limit)

    def update(self, book_id: int, data: BookUpdate) -> Book | None:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("At least one field is required / 至少需要一个更新字段")

        update_data = BookUpdateData(**changes, updated_at=datetime.now(UTC))
        return self.repository.update(book_id, update_data)

    def delete(self, book_id: int) -> bool:
        return self.repository.delete(book_id)

    def _create_invite_code(self) -> str:
        while True:
            suffix = "".join(secrets.choice(INVITE_CODE_ALPHABET) for _ in range(6))
            invite_code = f"OCB-{suffix}"
            if self.repository.get_by_invite_code(invite_code) is None:
                return invite_code
