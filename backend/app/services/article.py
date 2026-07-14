from app.models.article import Article
from app.schemas.article import ArticleCreate, ArticleUpdate
from app.services.base import BaseService


class ArticleService(BaseService[Article, ArticleCreate, ArticleUpdate]):
    def list_by_book(self, book_id: int) -> list[Article]:
        return self.repository.list_by_book(book_id)
