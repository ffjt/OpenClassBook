from datetime import datetime

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.models.author import Author
from app.models.book import Book
from app.models.invitation import Invitation


class InvitationRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_code(self, code: str) -> tuple[Invitation, Book] | None:
        statement = (
            select(Invitation, Book)
            .join(Book, Book.id == Invitation.book_id)
            .where(Invitation.code == code)
        )
        return self.session.execute(statement).one_or_none()

    def get_for_book(self, book_id: int, invitation_id: int) -> Invitation | None:
        statement = select(Invitation).where(
            Invitation.id == invitation_id,
            Invitation.book_id == book_id,
        )
        return self.session.scalar(statement)

    def get_default_for_book(self, book: Book) -> Invitation | None:
        statement = select(Invitation).where(
            Invitation.book_id == book.id,
            Invitation.code == book.invite_code,
        )
        return self.session.scalar(statement)

    def list_for_book(self, book_id: int) -> list[Invitation]:
        statement = (
            select(Invitation)
            .where(Invitation.book_id == book_id)
            .order_by(Invitation.created_at.desc(), Invitation.id.desc())
        )
        return list(self.session.scalars(statement))

    def create(
        self,
        book: Book,
        *,
        code: str,
        created_by: int,
        expires_at: datetime | None,
        max_uses: int | None,
        now: datetime,
    ) -> Invitation:
        invitation = Invitation(
            book_id=book.id,
            code=code,
            created_by=created_by,
            expires_at=expires_at,
            max_uses=max_uses,
            used_count=0,
            status="active",
            created_at=now,
        )
        self.session.add(invitation)
        book.invite_code = code
        book.updated_at = now
        self.session.commit()
        self.session.refresh(invitation)
        self.session.refresh(book)
        return invitation

    def update_settings(
        self,
        invitation: Invitation,
        *,
        expires_at: datetime | None,
        max_uses: int | None,
    ) -> Invitation:
        invitation.expires_at = expires_at
        invitation.max_uses = max_uses
        self.session.commit()
        self.session.refresh(invitation)
        return invitation

    def disable(self, invitation: Invitation) -> Invitation:
        invitation.status = "disabled"
        self.session.commit()
        self.session.refresh(invitation)
        return invitation

    def regenerate(
        self,
        book: Book,
        invitation: Invitation,
        *,
        code: str,
        now: datetime,
        expires_at: datetime | None,
    ) -> Invitation:
        invitation.status = "replaced"
        replacement = Invitation(
            book_id=book.id,
            code=code,
            created_by=invitation.created_by,
            expires_at=expires_at,
            max_uses=invitation.max_uses,
            used_count=0,
            status="active",
            created_at=now,
        )
        self.session.add(replacement)
        book.invite_code = code
        book.updated_at = now
        self.session.commit()
        self.session.refresh(replacement)
        self.session.refresh(book)
        return replacement

    def consume_and_create_author(
        self,
        invitation: Invitation,
        *,
        name: str,
        class_name: str | None,
        author_uuid: object,
        now: datetime,
    ) -> Author | None:

        usable = (
            update(Invitation)
            .where(
                Invitation.id == invitation.id,
                Invitation.status == "active",
                or_(
                    Invitation.expires_at.is_(None),
                    Invitation.expires_at > now,
                ),
                or_(
                    Invitation.max_uses.is_(None),
                    Invitation.used_count < Invitation.max_uses,
                ),
            )
            .values(used_count=Invitation.used_count + 1)
            .execution_options(synchronize_session=False)
        )
        if self.session.execute(usable).rowcount != 1:
            self.session.rollback()
            return None

        author = Author(
            book_id=invitation.book_id,
            name=name,
            class_name=class_name,
            uuid=author_uuid,
            created_at=now,
            updated_at=now,
        )
        self.session.add(author)
        self.session.commit()
        self.session.refresh(author)
        return author
