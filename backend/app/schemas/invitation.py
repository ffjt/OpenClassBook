from datetime import UTC, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

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
    author_token: str | None = None


InvitationStatus = Literal["active", "disabled", "replaced"]
InvitationCode = Annotated[
    str,
    StringConstraints(pattern=r"^OCB-[A-Z2-9]{26}$|^OCB-[A-Z0-9]{6}$"),
]


class InvitationSettings(BaseModel):
    expires_at: datetime | None = Field(
        default=None,
        description=(
            "Invitation expiry in UTC; omit for no expiry / "
            "邀请过期时间（UTC）；留空则永不过期"
        ),
    )
    max_uses: int | None = Field(
        default=None,
        ge=1,
        le=100_000,
        description=(
            "Maximum successful joins; omit for unlimited / "
            "最大成功加入次数；留空则不限次数"
        ),
    )

    @field_validator("expires_at")
    @classmethod
    def normalize_expiry(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC) if value is not None else None


class InvitationCreate(InvitationSettings):
    pass


class InvitationUpdate(InvitationSettings):
    pass


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
    code: InvitationCode
    created_by: int
    expires_at: datetime | None
    max_uses: int | None
    used_count: int = Field(ge=0)
    status: InvitationStatus
    created_at: datetime
