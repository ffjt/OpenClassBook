from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArticleBase(BaseModel):
    author_id: int
    title: str = Field(min_length=1, max_length=255)
    content: str
    images: list[str] = Field(default_factory=list)
    number: str = Field(min_length=1, max_length=50)
    review_status: str = Field(default="pending", max_length=32)


class ArticleCreate(ArticleBase):
    book_id: int


class ArticleUpdate(BaseModel):
    author_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = None
    images: list[str] | None = None
    number: str | None = Field(default=None, min_length=1, max_length=50)
    review_status: str | None = Field(default=None, max_length=32)


class ArticleResponse(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    created_at: datetime
    updated_at: datetime
