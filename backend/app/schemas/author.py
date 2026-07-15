from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

from app.schemas.book import BookResponse

AuthorStatus = Literal["invited", "joined", "not_joined"]
AuthorArticleStatus = Literal["not_started", "draft", "submitted"]
AuthorName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
]
AuthorNumber = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]


class AuthorBase(BaseModel):
    number: AuthorNumber
    name: AuthorName
    status: AuthorStatus = "joined"
    article_status: AuthorArticleStatus = "not_started"
    joined_at: datetime | None = None


class AuthorCreate(AuthorBase):
    pass


class AuthorUpdate(BaseModel):
    number: AuthorNumber | None = None
    name: AuthorName | None = None
    status: AuthorStatus | None = None
    article_status: AuthorArticleStatus | None = None
    joined_at: datetime | None = None

    @field_validator("number", "name", "status", "article_status")
    @classmethod
    def required_fields_cannot_be_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("field cannot be null / 字段不能为空")
        return value


class AuthorResponse(AuthorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    updated_at: datetime


class AuthorDetailResponse(AuthorResponse):
    book: BookResponse


class AuthorCreateData(AuthorCreate):
    book_id: int
    updated_at: datetime


class AuthorUpdateData(AuthorUpdate):
    updated_at: datetime
