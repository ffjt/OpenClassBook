from datetime import UTC, datetime
from uuid import uuid4

from app.models.author import Author
from app.repositories.author import AuthorRepository
from app.schemas.author import (
    AuthorCreate,
    AuthorCreateData,
    AuthorUpdate,
    AuthorUpdateData,
)
from app.schemas.book import resolve_class_name


class AuthorService:
    def __init__(self, repository: AuthorRepository) -> None:
        self.repository = repository

    def book_exists(self, book_id: int) -> bool:
        return self.repository.book_exists(book_id)

    def list_by_book(self, book_id: int) -> list[Author]:
        return self.repository.list_by_book(book_id)

    def search_by_name(self, book_id: int, name: str) -> list[Author]:
        return self.repository.search_by_name(book_id, name.strip())

    def get_preview(self, author_id: int):
        return self.repository.get_preview(author_id)

    def get(self, author_id: int) -> Author | None:
        return self.repository.get(author_id)

    def create(self, book_id: int, data: AuthorCreate) -> Author:
        book = self.repository.get_book(book_id)
        if book is None:
            raise ValueError("Book not found / 未找到书籍")
        now = datetime.now(UTC)
        return self.repository.create(
            AuthorCreateData(
                book_id=book_id,
                uuid=uuid4(),
                created_at=now,
                updated_at=now,
                name=data.name,
                class_name=resolve_class_name(
                    book.class_collection_mode,
                    book.class_fixed_value,
                    book.class_name_template,
                    data.class_value,
                ),
            )
        )

    def update(self, author_id: int, data: AuthorUpdate) -> Author | None:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("At least one field is required / 至少需要一个更新字段")

        return self.repository.update(
            author_id,
            AuthorUpdateData(**changes, updated_at=datetime.now(UTC)),
        )

    def delete(self, author_id: int) -> bool:
        return self.repository.delete(author_id)
