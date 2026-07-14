from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AuthorBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    number: str = Field(min_length=1, max_length=50)
    join_status: str = Field(default="pending", max_length=32)


class AuthorCreate(AuthorBase):
    book_id: int


class AuthorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    number: str | None = Field(default=None, min_length=1, max_length=50)
    join_status: str | None = Field(default=None, max_length=32)


class AuthorResponse(AuthorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    created_at: datetime
