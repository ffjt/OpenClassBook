from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
)

BookTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
OwnerName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
]
Description = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=2000),
]
InviteCode = Annotated[str, StringConstraints(pattern=r"^OCB-[A-Z0-9]{6}$")]
NumberMode = Literal["none", "automatic", "import"]
BookStatus = Literal["collecting", "reviewing", "published"]


class BookBase(BaseModel):
    title: BookTitle = Field(description="Book title / 书名")
    description: Description | None = Field(
        default=None,
        description="Book description / 书籍简介",
    )
    owner_name: OwnerName = Field(description="Book owner / 负责人")
    number_mode: NumberMode = Field(
        default="none",
        description="Article numbering mode / 文章编号模式",
    )
    status: BookStatus = Field(
        default="collecting",
        description="Book status / 书籍状态",
    )


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: BookTitle | None = Field(default=None, description="Book title / 书名")
    description: Description | None = Field(
        default=None,
        description="Book description / 书籍简介",
    )
    owner_name: OwnerName | None = Field(
        default=None,
        description="Book owner / 负责人",
    )
    number_mode: NumberMode | None = Field(
        default=None,
        description="Article numbering mode / 文章编号模式",
    )
    status: BookStatus | None = Field(
        default=None,
        description="Book status / 书籍状态",
    )

    @field_validator("title", "owner_name", "number_mode", "status")
    @classmethod
    def required_fields_cannot_be_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("field cannot be null / 字段不能为空")
        return value


class BookResponse(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invite_code: InviteCode = Field(description="Invitation code / 邀请码")
    author_count: int = Field(default=0, ge=0, description="Author count / 作者数量")
    created_at: datetime
    updated_at: datetime


class BookCreateData(BookCreate):
    """Service-enriched data passed from the service to the repository."""

    invite_code: InviteCode
    created_at: datetime
    updated_at: datetime


class BookUpdateData(BookUpdate):
    """Service-enriched update passed from the service to the repository."""

    updated_at: datetime
