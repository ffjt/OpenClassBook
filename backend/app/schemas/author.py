from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.schemas.article import ArticleStatus
from app.schemas.book import BookResponse

AuthorName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
]


class AuthorBase(BaseModel):
    name: AuthorName


class AuthorCreate(AuthorBase):
    pass


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
    created_at: datetime
    updated_at: datetime


class AuthorDetailResponse(AuthorResponse):
    book: BookResponse


class LatestArticlePreview(BaseModel):
    title: str
    excerpt: str
    status: ArticleStatus
    updated_at: datetime


class AuthorPreviewResponse(BaseModel):
    article_count: int
    latest_article: LatestArticlePreview | None


class AuthorCreateData(AuthorCreate):
    book_id: int
    uuid: UUID
    created_at: datetime
    updated_at: datetime


class AuthorUpdateData(AuthorUpdate):
    updated_at: datetime
