import secrets
from datetime import UTC, datetime

from app.models.book import Book
from app.models.invitation import Invitation
from app.repositories.invitation import InvitationRepository
from app.schemas.invitation import InvitationCreate, InvitationUpdate

INVITATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
INVITATION_CODE_LENGTH = 26


class InvitationConfigurationError(ValueError):
    pass


class InvitationService:
    def __init__(self, repository: InvitationRepository) -> None:
        self.repository = repository

    def list_for_book(self, book_id: int) -> list[Invitation]:
        return self.repository.list_for_book(book_id)

    def create(
        self,
        book: Book,
        created_by: int,
        data: InvitationCreate,
        *,
        code: str | None = None,
    ) -> Invitation:
        now = datetime.now(UTC)
        self._validate_settings(data.expires_at, data.max_uses, 0, now)
        return self.repository.create(
            book,
            code=code or self.create_code(),
            created_by=created_by,
            expires_at=data.expires_at,
            max_uses=data.max_uses,
            now=now,
        )

    def update(
        self, book_id: int, invitation_id: int, data: InvitationUpdate
    ) -> Invitation | None:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            raise InvitationConfigurationError("empty_update")
        invitation = self.repository.get_for_book(book_id, invitation_id)
        if invitation is None:
            return None
        expires_at = changes.get("expires_at", invitation.expires_at)
        max_uses = changes.get("max_uses", invitation.max_uses)
        self._validate_settings(
            expires_at,
            max_uses,
            invitation.used_count,
            datetime.now(UTC),
        )
        return self.repository.update_settings(
            invitation,
            expires_at=expires_at,
            max_uses=max_uses,
        )

    def disable(self, book_id: int, invitation_id: int) -> Invitation | None:
        invitation = self.repository.get_for_book(book_id, invitation_id)
        return self.repository.disable(invitation) if invitation is not None else None

    def regenerate(self, book: Book, invitation_id: int) -> Invitation | None:
        invitation = self.repository.get_for_book(book.id, invitation_id)
        if invitation is None:
            return None
        now = datetime.now(UTC)
        return self.repository.regenerate(
            book,
            invitation,
            code=self.create_code(),
            now=now,
            expires_at=self._renewal_expiry(invitation.expires_at, now),
        )

    def regenerate_default(self, book: Book) -> Invitation:
        current = self.repository.get_default_for_book(book)
        if current is None:
            return self.create(book, book.owner_id, InvitationCreate())
        now = datetime.now(UTC)
        return self.repository.regenerate(
            book,
            current,
            code=self.create_code(),
            now=now,
            expires_at=self._renewal_expiry(current.expires_at, now),
        )

    def create_code(self) -> str:
        while True:
            code = "OCB-" + "".join(
                secrets.choice(INVITATION_CODE_ALPHABET)
                for _ in range(INVITATION_CODE_LENGTH)
            )
            if self.repository.get_by_code(code) is None:
                return code

    @staticmethod
    def _validate_settings(
        expires_at: datetime | None,
        max_uses: int | None,
        used_count: int,
        now: datetime,
    ) -> None:
        normalized_expiry = InvitationService._as_utc(expires_at)
        if normalized_expiry is not None and normalized_expiry <= now:
            raise InvitationConfigurationError("expiration_in_past")
        if max_uses is not None and max_uses < used_count:
            raise InvitationConfigurationError("max_uses_below_used_count")

    @staticmethod
    def _as_utc(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    @staticmethod
    def _renewal_expiry(value: datetime | None, now: datetime) -> datetime | None:
        expiry = InvitationService._as_utc(value)
        return expiry if expiry is not None and expiry > now else None
