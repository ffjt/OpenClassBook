from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from app.models.author import Author
from app.models.book import Book
from app.models.invitation import Invitation
from app.repositories.join import JoinRepository
from app.schemas.book import resolve_class_name
from app.schemas.invitation import JoinCreate


class JoinUnavailableError(ValueError):
    def __init__(
        self,
        code: Literal[
            "invite_disabled",
            "invitation_expired",
            "invitation_max_uses_reached",
            "submission_disabled",
        ],
    ) -> None:
        super().__init__(code)
        self.code = code


class JoinService:
    def __init__(self, repository: JoinRepository) -> None:
        self.repository = repository

    def get_book(self, invite_code: str) -> Book | None:
        result = self._get_invitation(invite_code)
        return result[1] if result is not None else None

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
        result = self._get_invitation(invite_code)
        if result is None:
            return None
        invitation, book = result
        if not book.submission_enabled:
            raise JoinUnavailableError("submission_disabled")
        author = self._create_author(invitation, book, data)
        if author is None:
            self._raise_current_invitation_state(invite_code)
            return None
        return "created", author

    def create_additional_author(
        self, invite_code: str, data: JoinCreate
    ) -> Author | None:
        result = self._get_invitation(invite_code)
        if result is None:
            return None
        invitation, book = result
        if not book.submission_enabled:
            raise JoinUnavailableError("submission_disabled")
        author = self._create_author(invitation, book, data)
        if author is None:
            self._raise_current_invitation_state(invite_code)
        return author

    def get_author(self, author_id: int) -> tuple[Author, Book, int] | None:
        return self.repository.get_author_with_book(author_id)

    def _get_invitation(self, invite_code: str) -> tuple[Invitation, Book] | None:
        result = self.repository.get_invitation_by_code(invite_code.strip().upper())
        if result is None:
            return None
        invitation, book = result
        if invitation.status == "replaced":
            return None
        self._validate_invitation(invitation, book)
        return invitation, book

    def _raise_current_invitation_state(self, invite_code: str) -> None:
        result = self.repository.get_invitation_by_code(invite_code.strip().upper())
        if result is not None:
            self._validate_invitation(*result)

    def _validate_invitation(self, invitation: Invitation, book: Book) -> None:
        if not book.invite_enabled or invitation.status != "active":
            raise JoinUnavailableError("invite_disabled")
        now = datetime.now(UTC)
        expires_at = invitation.expires_at
        if expires_at is not None:
            expiry = (
                expires_at.replace(tzinfo=UTC)
                if expires_at.tzinfo is None
                else expires_at.astimezone(UTC)
            )
            if expiry <= now:
                raise JoinUnavailableError("invitation_expired")
        if (
            invitation.max_uses is not None
            and invitation.used_count >= invitation.max_uses
        ):
            raise JoinUnavailableError("invitation_max_uses_reached")

    def _create_author(
        self, invitation: Invitation, book: Book, data: JoinCreate
    ) -> Author | None:
        return self.repository.consume_invitation_and_create_author(
            invitation,
            name=data.name,
            class_name=resolve_class_name(
                book.class_collection_mode,
                book.class_fixed_value,
                book.class_name_template,
                book.class_value_style,
                data.class_value,
            ),
            author_uuid=uuid4(),
            now=datetime.now(UTC),
        )
