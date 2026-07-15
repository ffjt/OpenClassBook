from datetime import UTC, datetime

from app.models.article import Article
from app.repositories.article import ArticleRepository
from app.schemas.article import (
    ArticleCreate,
    ArticleCreateData,
    ArticleNumberAssignment,
    ArticleOrderAssignment,
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

    def list_by_book(
        self,
        book_id: int,
        *,
        include_drafts: bool = True,
    ) -> list[Article]:
        return self.repository.list_by_book(
            book_id,
            include_drafts=include_drafts,
        )

    def list_by_author(self, author_id: int) -> list[Article]:
        return self.repository.list_by_author(author_id)

    def author_exists(self, author_id: int) -> bool:
        return self.repository.author_exists(author_id)

    def get(self, article_id: int) -> Article | None:
        return self.repository.get(article_id)

    def create(self, book_id: int, data: ArticleCreate) -> Article:
        now = datetime.now(UTC)
        values = data.model_dump()
        book = self.repository.get_book(book_id)
        if book is None:
            raise LookupError("book_not_found")
        if book.number_mode == "automatic":
            number = values["number"]
            if not number:
                raise ValueError("article_number_required")
            if self.repository.number_exists(book_id, number):
                raise ValueError("article_number_already_claimed")
        elif book.number_mode == "none":
            values["number"] = ""
        submitted_at = now if values["status"] == "pending" else None
        return self.repository.create(
            ArticleCreateData(
                book_id=book_id,
                submitted_at=submitted_at,
                created_at=now,
                updated_at=now,
                **values,
            )
        )

    def assign_numbers(
        self,
        book_id: int,
        data: ArticleNumberAssignment,
    ) -> list[Article]:
        book = self.repository.get_book(book_id)
        if book is None:
            raise LookupError("book_not_found")
        if book.number_mode != "none":
            raise ValueError("layout_numbering_required")

        book_articles, ordered_articles = self._resolve_approved_order(book_id, data)
        return self.repository.save_number_assignments(
            book,
            book_articles,
            ordered_articles,
        )

    def arrange_layout(
        self,
        book_id: int,
        data: ArticleOrderAssignment,
    ) -> list[Article]:
        book = self.repository.get_book(book_id)
        if book is None:
            raise LookupError("book_not_found")
        book_articles, ordered_articles = self._resolve_approved_order(book_id, data)
        if book.number_mode == "none":
            return self.repository.save_number_assignments(
                book,
                book_articles,
                ordered_articles,
            )
        return self.repository.save_layout_order(book, ordered_articles)

    def _resolve_approved_order(
        self,
        book_id: int,
        data: ArticleOrderAssignment,
    ) -> tuple[list[Article], list[Article]]:
        book_articles = self.repository.list_by_book(book_id)
        articles_by_id = {
            article.id: article
            for article in book_articles
            if article.status == "approved"
        }
        if set(data.article_ids) != set(articles_by_id):
            raise ValueError("approved_article_order_required")
        return book_articles, [
            articles_by_id[article_id] for article_id in data.article_ids
        ]

    def update(self, article_id: int, data: ArticleUpdate) -> Article | None:
        changes = data.model_dump(exclude_unset=True)
        if not changes:
            raise ValueError("At least one field is required / 至少需要一个更新字段")

        now = datetime.now(UTC)
        if changes.get("status") == "pending":
            changes["submitted_at"] = now
        return self.repository.update(
            article_id,
            ArticleUpdateData(**changes, updated_at=now),
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
