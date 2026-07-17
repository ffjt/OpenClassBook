from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

from app.schemas.author import ClassValue
from app.schemas.book import BookResponse

AuthorJoinName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
]


class JoinBookResponse(BaseModel):
    book: BookResponse


class JoinCreate(BaseModel):
    name: AuthorJoinName
    class_value: ClassValue | None = None


class JoinResponse(BaseModel):
    mode: Literal["created", "selection_required"]
    author_id: int | None = None
