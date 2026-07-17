from sqlalchemy import func, select
from sqlalchemy.orm import aliased

from app.models.article import Article
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

    def list_by_book(self, book_id: int):
        return self._list_with_previews(Author.book_id == book_id)

    def search_by_name(self, book_id: int, name: str):
        return self._list_with_previews(
            Author.book_id == book_id,
            Author.name == name,
        )

    def _list_with_previews(self, *filters):
        counts = (
            select(
                Article.author_id.label("author_id"),
                func.count(Article.id).label("article_count"),
            )
            .group_by(Article.author_id)
            .subquery()
        )
        latest_id = (
            select(Article.id)
            .where(Article.author_id == Author.id)
            .order_by(Article.updated_at.desc(), Article.id.desc())
            .limit(1)
            .correlate(Author)
            .scalar_subquery()
        )
        latest = aliased(Article)
        statement = (
            select(Author, func.coalesce(counts.c.article_count, 0), latest)
            .outerjoin(counts, counts.c.author_id == Author.id)
            .outerjoin(latest, latest.id == latest_id)
            .where(*filters)
            .order_by(Author.updated_at.desc(), Author.id.desc())
        )
        return list(self.session.execute(statement).all())

    def book_exists(self, book_id: int) -> bool:
        return self.session.get(Book, book_id) is not None

    def get_book(self, book_id: int) -> Book | None:
        return self.session.get(Book, book_id)

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
