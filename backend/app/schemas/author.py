from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.schemas.article import ArticleStatus
from app.schemas.book import BookResponse, NumberMode

AuthorName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
]
ClassValue = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
]


class AuthorBase(BaseModel):
    name: AuthorName


class AuthorCreate(AuthorBase):
    class_value: ClassValue | None = None


class AuthorUpdate(BaseModel):
    name: AuthorName | None = None

    @field_validator("name")
    @classmethod
    def name_cannot_be_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("field cannot be null / 字段不能为空")
        return value


class AuthorResponse(AuthorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    class_name: str | None = None
    created_at: datetime
    updated_at: datetime


class AuthorBookResponse(BaseModel):
    """Book settings an author needs to submit, without owner-only data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    owner_name: str
    author_count: int = Field(ge=0, description="Author count / 作者数量")
    submission_enabled: bool
    submission_deadline: datetime | None
    allow_multiple_articles: bool
    limit_articles_per_author: bool
    max_articles_per_author: int
    allow_edit_after_submit: bool
    allow_delete_article: bool
    number_mode: NumberMode
    claim_number_start: int
    claim_number_end: int
    number_prefix: str
    number_digits: int


class AuthorDetailResponse(AuthorResponse):
    book: BookResponse | AuthorBookResponse


class LatestArticlePreview(BaseModel):
    title: str
    excerpt: str
    status: ArticleStatus
    updated_at: datetime


class AuthorSummaryResponse(AuthorResponse):
    article_count: int
    latest_article: LatestArticlePreview | None


class AuthorCreateData(AuthorCreate):
    class_value: ClassValue | None = Field(default=None, exclude=True)
    class_name: str | None = None
    book_id: int
    uuid: UUID
    created_at: datetime
    updated_at: datetime


class AuthorUpdateData(AuthorUpdate):
    updated_at: datetime
