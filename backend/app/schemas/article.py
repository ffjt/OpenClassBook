from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

ArticleStatus = Literal["draft", "pending", "approved", "rejected"]
ArticleTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
ArticleNumber = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=50),
]
AssignedArticleNumber = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]


class ArticleBase(BaseModel):
    author_id: int = Field(gt=0)
    number: ArticleNumber
    title: ArticleTitle
    content: str = ""
    image: str | None = None
    status: ArticleStatus = "draft"


class ArticleCreate(ArticleBase):
    number: AssignedArticleNumber | None = None


class ArticleUpdate(BaseModel):
    author_id: int | None = Field(default=None, gt=0)
    number: AssignedArticleNumber | None = None
    title: ArticleTitle | None = None
    content: str | None = None
    image: str | None = None
    status: ArticleStatus | None = None

    @field_validator("author_id", "number", "title", "content", "status")
    @classmethod
    def required_fields_cannot_be_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("field cannot be null / 字段不能为空")
        return value


class ArticleStatusUpdate(BaseModel):
    status: ArticleStatus


class ArticleOrderAssignment(BaseModel):
    article_ids: list[int] = Field(min_length=1)

    @field_validator("article_ids")
    @classmethod
    def article_ids_must_be_unique_and_positive(cls, value: list[int]) -> list[int]:
        if any(article_id <= 0 for article_id in value):
            raise ValueError("article ids must be positive / 文章 ID 必须为正整数")
        if len(value) != len(set(value)):
            raise ValueError("article ids must be unique / 文章 ID 不能重复")
        return value


class ArticleNumberAssignment(ArticleOrderAssignment):
    pass


class ArticleResponse(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    submitted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ArticleCreateData(ArticleCreate):
    number: ArticleNumber
    book_id: int
    submitted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ArticleUpdateData(ArticleUpdate):
    submitted_at: datetime | None = None
    updated_at: datetime
