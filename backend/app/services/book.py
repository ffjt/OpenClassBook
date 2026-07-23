from datetime import UTC, datetime

from app.models.book import Book
from app.repositories.book import BookRepository
from app.repositories.invitation import InvitationRepository
from app.schemas.book import (
    BookCreate,
    BookCreateData,
    BookUpdate,
    BookUpdateData,
    validate_class_collection_configuration,
    validate_numbering_configuration,
)
from app.schemas.invitation import InvitationCreate
from app.services.invitation import InvitationService


class BookService:
    def __init__(
        self,
        repository: BookRepository,
        invitation_repository: InvitationRepository,
    ) -> None:
        self.repository = repository
        self.invitations = InvitationService(invitation_repository)

    def create(self, data: BookCreate, owner_id: int) -> Book:
        now = datetime.now(UTC)
        invite_code = self.invitations.create_code()
        create_data = BookCreateData(
            **data.model_dump(),
            owner_id=owner_id,
            invite_code=invite_code,
            created_at=now,
            updated_at=now,
        )
        book = self.repository.create(create_data)
        self.invitations.create(
            book,
            owner_id,
            InvitationCreate(),
            code=invite_code,
        )
        return book

    def get(self, book_id: int) -> Book | None:
        return self.repository.get(book_id)

    def get_for_owner(self, book_id: int, owner_id: int) -> Book | None:
        return self.repository.get_by_owner(book_id, owner_id)

    def list_for_owner(
        self, owner_id: int, *, offset: int = 0, limit: int = 100
    ) -> list[Book]:
        return self.repository.list_by_owner(owner_id, offset=offset, limit=limit)

    def update(self, book_id: int, data: BookUpdate) -> Book | None:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("At least one field is required / 至少需要一个更新字段")

        current = self.repository.get(book_id)
        if current is None:
            return None
        number_mode = changes.get("number_mode", current.number_mode)
        validate_numbering_configuration(
            number_mode,
            changes.get("claim_number_start", current.claim_number_start),
            changes.get("claim_number_end", current.claim_number_end),
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
        book = self.repository.get(book_id)
        if book is None:
            return None
        self.invitations.regenerate_default(book)
        return book

    def delete_drafts(self, book_id: int) -> Book | None:
        return self.repository.delete_drafts(book_id, datetime.now(UTC))

    def delete_articles(self, book_id: int) -> Book | None:
        return self.repository.delete_articles(book_id, datetime.now(UTC))

    def delete_authors(self, book_id: int) -> Book | None:
        return self.repository.delete_authors(book_id, datetime.now(UTC))
