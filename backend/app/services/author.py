from app.models.author import Author
from app.schemas.author import AuthorCreate, AuthorUpdate
from app.services.base import BaseService


class AuthorService(BaseService[Author, AuthorCreate, AuthorUpdate]):
    def list_by_book(self, book_id: int) -> list[Author]:
        return self.repository.list_by_book(book_id)
