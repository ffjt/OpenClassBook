from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.author import Author
from app.models.book import Book
from app.models.invitation import Invitation
from app.repositories.invitation import InvitationRepository


class JoinRepository:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.invitations = InvitationRepository(session)

    def get_invitation_by_code(self, code: str) -> tuple[Invitation, Book] | None:
        return self.invitations.get_by_code(code)

    def consume_invitation_and_create_author(
        self,
        invitation: Invitation,
        *,
        name: str,
        class_name: str | None,
        author_uuid: UUID,
        now: datetime,
    ) -> Author | None:
        return self.invitations.consume_and_create_author(
            invitation,
            name=name,
            class_name=class_name,
            author_uuid=author_uuid,
            now=now,
        )

    def get_book_by_invite_code(self, invite_code: str) -> Book | None:
        statement = select(Book).where(
            Book.invite_code == invite_code,
            Book.owner_id.is_not(None),
        )
        return self.session.scalar(statement)

    def find_authors(self, book_id: int, name: str) -> list[Author]:
        statement = (
            select(Author)
            .where(Author.book_id == book_id, Author.name == name)
            .order_by(Author.updated_at.desc(), Author.id.desc())
        )
        return list(self.session.scalars(statement))

    def create_author(
        self,
        book: Book,
        name: str,
        class_name: str | None,
        author_uuid: UUID,
        now: datetime,
    ) -> Author:
        author = Author(
            book_id=book.id,
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

    def get_author_with_book(self, author_id: int) -> tuple[Author, Book, int] | None:
        author_count = (
            select(func.count(Author.id))
            .where(Author.book_id == Book.id)
            .correlate(Book)
            .scalar_subquery()
        )
        statement = (
            select(Author, Book, author_count)
            .join(Book, Book.id == Author.book_id)
            .where(Author.id == author_id)
        )
        return self.session.execute(statement).one_or_none()
