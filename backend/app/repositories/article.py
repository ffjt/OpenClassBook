from sqlalchemy import select

from app.models.article import Article
from app.repositories.base import BaseRepository
from app.schemas.article import ArticleCreate, ArticleUpdate


class ArticleRepository(BaseRepository[Article, ArticleCreate, ArticleUpdate]):
    model = Article

    def list_by_book(self, book_id: int) -> list[Article]:
        statement = (
            select(Article)
            .where(Article.book_id == book_id)
            .order_by(Article.updated_at.desc(), Article.id.desc())
        )
        return list(self.session.scalars(statement))
