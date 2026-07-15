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
    pass


class ArticleUpdate(BaseModel):
    author_id: int | None = Field(default=None, gt=0)
    number: ArticleNumber | None = None
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


class ArticleResponse(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    created_at: datetime
    updated_at: datetime


class ArticleCreateData(ArticleCreate):
    book_id: int
    created_at: datetime
    updated_at: datetime


class ArticleUpdateData(ArticleUpdate):
    updated_at: datetime
