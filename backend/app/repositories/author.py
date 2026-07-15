from sqlalchemy import select

from app.models.author import Author
from app.models.book import Book
from app.repositories.base import BaseRepository
from app.schemas.author import AuthorCreateData, AuthorUpdateData


class AuthorRepository(BaseRepository[Author, AuthorCreateData, AuthorUpdateData]):
    model = Author

    def create(self, data: AuthorCreateData) -> Author:
        author = Author(**data.model_dump())
        self.session.add(author)
        self.session.commit()
        self.session.refresh(author)
        return author

    def get(self, resource_id: int) -> Author | None:
        return self.session.get(Author, resource_id)

    def list_by_book(self, book_id: int) -> list[Author]:
        statement = (
            select(Author)
            .where(Author.book_id == book_id)
            .order_by(Author.updated_at.desc(), Author.id.desc())
        )
        return list(self.session.scalars(statement))

    def book_exists(self, book_id: int) -> bool:
        return self.session.get(Book, book_id) is not None

    def update(self, resource_id: int, data: AuthorUpdateData) -> Author | None:
        author = self.get(resource_id)
        if author is None:
            return None

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(author, field, value)

        self.session.commit()
        self.session.refresh(author)
        return author

    def delete(self, resource_id: int) -> bool:
        author = self.get(resource_id)
        if author is None:
            return False

        self.session.delete(author)
        self.session.commit()
        return True
