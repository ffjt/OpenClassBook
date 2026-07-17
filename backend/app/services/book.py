import secrets
import string
from datetime import UTC, datetime

from app.models.book import Book
from app.repositories.book import BookRepository
from app.schemas.book import (
    BookCreate,
    BookCreateData,
    BookUpdate,
    BookUpdateData,
    validate_class_collection_configuration,
    validate_numbering_configuration,
)

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

        current = self.repository.get(book_id)
        if current is None:
            return None
        if "number_mode" in changes:
            if changes["number_mode"] == "existing":
                changes.setdefault(
                    "existing_number_mode",
                    current.existing_number_mode
                    if current.number_mode == "existing"
                    else "claim",
                )
            else:
                changes.setdefault("existing_number_mode", None)
                changes.setdefault("number_pool", [])
        if changes.get("existing_number_mode") == "claim":
            changes.setdefault("number_pool", [])
        number_mode = changes.get("number_mode", current.number_mode)
        existing_number_mode = changes.get(
            "existing_number_mode", current.existing_number_mode
        )
        number_pool = changes.get("number_pool", current.number_pool or [])
        validate_numbering_configuration(
            number_mode,
            existing_number_mode,
            number_pool,
        )
        class_collection_mode = changes.get(
            "class_collection_mode", current.class_collection_mode
        )
        if "class_collection_mode" in changes:
            if class_collection_mode == "none":
                changes.setdefault("class_fixed_value", None)
                changes.setdefault("class_name_template", None)
                changes.setdefault("class_value_style", None)
            elif class_collection_mode == "fixed":
                changes.setdefault("class_name_template", None)
                changes.setdefault("class_value_style", None)
            else:
                changes.setdefault("class_fixed_value", None)
        validate_class_collection_configuration(
            class_collection_mode,
            changes.get("class_fixed_value", current.class_fixed_value),
            changes.get("class_name_template", current.class_name_template),
            changes.get("class_value_style", current.class_value_style),
        )

        update_data = BookUpdateData(**changes, updated_at=datetime.now(UTC))
        updated = self.repository.update(book_id, update_data)
        if updated is not None and "number_mode" in changes and number_mode in {
            "none",
            "automatic",
        }:
            return self.repository.clear_article_numbers(book_id)
        return updated

    def delete(self, book_id: int) -> bool:
        return self.repository.delete(book_id)

    def regenerate_invite_code(self, book_id: int) -> Book | None:
        if self.repository.get(book_id) is None:
            return None
        return self.repository.regenerate_invite_code(
            book_id,
            self._create_invite_code(),
            datetime.now(UTC),
        )

    def delete_drafts(self, book_id: int) -> Book | None:
        return self.repository.delete_drafts(book_id, datetime.now(UTC))

    def delete_articles(self, book_id: int) -> Book | None:
        return self.repository.delete_articles(book_id, datetime.now(UTC))

    def delete_authors(self, book_id: int) -> Book | None:
        return self.repository.delete_authors(book_id, datetime.now(UTC))

    def _create_invite_code(self) -> str:
        while True:
            suffix = "".join(secrets.choice(INVITE_CODE_ALPHABET) for _ in range(6))
            invite_code = f"OCB-{suffix}"
            if self.repository.get_by_invite_code(invite_code) is None:
                return invite_code
