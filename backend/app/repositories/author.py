from sqlalchemy import select

from app.models.author import Author
from app.repositories.base import BaseRepository
from app.schemas.author import AuthorCreate, AuthorUpdate


class AuthorRepository(BaseRepository[Author, AuthorCreate, AuthorUpdate]):
    model = Author

    def list_by_book(self, book_id: int) -> list[Author]:
        statement = (
            select(Author)
            .where(Author.book_id == book_id)
            .order_by(Author.created_at.desc(), Author.id.desc())
        )
        return list(self.session.scalars(statement))
