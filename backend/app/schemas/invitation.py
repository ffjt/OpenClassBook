from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

from app.schemas.book import BookResponse, BookTitle, InviteCode, OwnerName

AuthorJoinName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
]


class InviteResponse(BaseModel):
    book_id: int
    title: BookTitle
    owner_name: OwnerName
    invite_code: InviteCode


class JoinBookResponse(BaseModel):
    book: BookResponse


class JoinCreate(BaseModel):
    name: AuthorJoinName


class JoinResponse(BaseModel):
    mode: Literal["created", "selection_required"]
    author_id: int | None = None
