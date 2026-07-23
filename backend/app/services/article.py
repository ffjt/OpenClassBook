from datetime import UTC, datetime

from app.models.article import Article
from app.models.book import Book
from app.repositories.article import ArticleRepository
from app.schemas.article import (
    ArticleCreate,
    ArticleCreateData,
    ArticleEditRequestDecision,
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
        self._ensure_submission_open(book, now)
        article_limit = 1 if not book.allow_multiple_articles else (
            book.max_articles_per_author if book.limit_articles_per_author else None
        )
        if (
            article_limit is not None
            and self.repository.count_by_author(data.author_id) >= article_limit
        ):
            raise ValueError("article_limit_reached")
        if book.number_mode == "existing":
            number = self._normalize_claim_number(values["number"], book)
            values["number"] = number
            if self.repository.number_exists(book_id, number):
                raise ValueError("article_number_already_claimed")
        else:
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
        if book.number_mode != "automatic":
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
        if book.number_mode == "automatic":
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

        current = self.repository.get(article_id)
        if current is None:
            return None
        book = self.repository.get_book(current.book_id)
        if book is None:
            raise LookupError("book_not_found")
        now = datetime.now(UTC)
        self._ensure_submission_open(book, now)
        if current.status == "approved":
            raise ValueError("article_reviewed_locked")
        if current.status != "draft" and not book.allow_edit_after_submit:
            raise ValueError("article_submission_locked")
        if "number" in changes:
            if book.number_mode in {"none", "automatic"}:
                changes["number"] = ""
            else:
                number = self._normalize_claim_number(changes["number"], book)
                changes["number"] = number
                if self.repository.number_exists(
                    current.book_id,
                    number,
                    exclude_article_id=article_id,
                ):
                    raise ValueError("article_number_already_claimed")

        if changes.get("status") == "pending":
            changes["submitted_at"] = now
        return self.repository.update(
            article_id,
            ArticleUpdateData(**changes, updated_at=now),
        )

    @staticmethod
    def _normalize_claim_number(number: str | None, book: Book) -> str:
        value = (number or "").strip()
        if not value:
            raise ValueError("article_number_required")
        if not value.isdecimal():
            raise ValueError("article_number_not_available")
        claim_number = int(value)
        if not book.claim_number_start <= claim_number <= book.claim_number_end:
            raise ValueError("article_number_not_available")
        return str(claim_number)

    @staticmethod
    def _ensure_submission_open(book: Book, now: datetime) -> None:
        if not book.submission_enabled:
            raise ValueError("submission_disabled")
        deadline = book.submission_deadline
        if deadline is None:
            return
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=UTC)
        if now > deadline:
            raise ValueError("submission_deadline_passed")

    def update_status(
        self,
        article_id: int,
        data: ArticleStatusUpdate,
    ) -> Article | None:
        return self.repository.update(
            article_id,
            ArticleUpdateData(
                status=data.status,
                edit_requested_at=None,
                updated_at=datetime.now(UTC),
            ),
        )

    def request_edit(self, article_id: int) -> Article | None:
        article = self.repository.get(article_id)
        if article is None:
            return None
        if article.status != "approved":
            raise ValueError("article_edit_request_unavailable")
        if article.edit_requested_at is not None:
            raise ValueError("article_edit_request_pending")
        now = datetime.now(UTC)
        return self.repository.update(
            article_id,
            ArticleUpdateData(edit_requested_at=now, updated_at=now),
        )

    def resolve_edit_request(
        self,
        article_id: int,
        data: ArticleEditRequestDecision,
    ) -> Article | None:
        article = self.repository.get(article_id)
        if article is None:
            return None
        if article.edit_requested_at is None:
            raise ValueError("article_edit_request_not_found")
        now = datetime.now(UTC)
        changes: dict[str, object] = {
            "edit_requested_at": None,
            "updated_at": now,
        }
        if data.action == "approve":
            changes.update(status="draft", submitted_at=None)
        return self.repository.update(article_id, ArticleUpdateData(**changes))

    def delete(self, article_id: int) -> bool:
        return self.repository.delete(article_id)
