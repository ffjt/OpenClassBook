from datetime import UTC, datetime

from app.models.article import Article
from app.repositories.article import ArticleRepository
from app.schemas.article import (
    ArticleCreate,
    ArticleCreateData,
    ArticleStatusUpdate,
    ArticleUpdate,
    ArticleUpdateData,
)


class ArticleService:
    def __init__(self, repository: ArticleRepository) -> None:
        self.repository = repository

    def book_exists(self, book_id: int) -> bool:
        return self.repository.book_exists(book_id)

    def author_belongs_to_book(self, author_id: int, book_id: int) -> bool:
        return self.repository.author_belongs_to_book(author_id, book_id)

    def list_by_book(self, book_id: int) -> list[Article]:
        return self.repository.list_by_book(book_id)

    def get(self, article_id: int) -> Article | None:
        return self.repository.get(article_id)

    def create(self, book_id: int, data: ArticleCreate) -> Article:
        now = datetime.now(UTC)
        return self.repository.create(
            ArticleCreateData(
                book_id=book_id,
                created_at=now,
                updated_at=now,
                **data.model_dump(),
            )
        )

    def update(self, article_id: int, data: ArticleUpdate) -> Article | None:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("At least one field is required / 至少需要一个更新字段")

        return self.repository.update(
            article_id,
            ArticleUpdateData(**changes, updated_at=datetime.now(UTC)),
        )

    def update_status(
        self,
        article_id: int,
        data: ArticleStatusUpdate,
    ) -> Article | None:
        return self.repository.update(
            article_id,
            ArticleUpdateData(status=data.status, updated_at=datetime.now(UTC)),
        )

    def delete(self, article_id: int) -> bool:
        return self.repository.delete(article_id)
