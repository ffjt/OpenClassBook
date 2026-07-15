from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
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
PAGE_FILE_MAX_LENGTH = 2_048
LAYOUT_SECTION_LIMIT = 50
LayoutSectionKind = Literal["page", "articles"]
LayoutSectionPreset = Literal[
    "cover",
    "preface",
    "articles",
    "principal_message",
    "teacher_message",
    "afterword",
    "closing",
    "acknowledgement",
    "back_cover",
]
LayoutSectionId = Annotated[
    str,
    StringConstraints(pattern=r"^[A-Za-z0-9_-]+$", min_length=1, max_length=64),
]
LayoutSectionName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=80),
]


class BookLayoutSection(BaseModel):
    id: LayoutSectionId
    kind: LayoutSectionKind
    preset: LayoutSectionPreset | None = None
    name: LayoutSectionName | None = None
    file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)

    @model_validator(mode="after")
    def validate_section_identity(self) -> "BookLayoutSection":
        if self.kind == "articles":
            if self.preset != "articles" or self.name is not None:
                raise ValueError("Main content cannot be renamed / 正文板块不能重命名")
            return self
        if self.preset == "articles":
            raise ValueError(
                "Page section cannot use articles preset / 页面不能使用正文预设"
            )
        if self.preset is None and self.name is None:
            raise ValueError("Page section requires a name / 页面板块必须有名称")
        return self


def _validate_layout_sections(
    sections: list[BookLayoutSection] | None,
) -> list[BookLayoutSection] | None:
    if sections is None:
        return None
    if not sections or len(sections) > LAYOUT_SECTION_LIMIT:
        raise ValueError(
            "Book must contain 1-50 sections / 书籍必须包含 1 到 50 个板块"
        )
    if len({section.id for section in sections}) != len(sections):
        raise ValueError("Section ids must be unique / 板块 ID 不能重复")
    if sum(section.kind == "articles" for section in sections) != 1:
        raise ValueError(
            "Book must contain exactly one main-content section / "
            "书籍必须且只能有一个正文板块"
        )
    return sections


def _validate_article_order(article_ids: list[int] | None) -> list[int] | None:
    if article_ids is None:
        return None
    if any(article_id <= 0 for article_id in article_ids):
        raise ValueError("Article ids must be positive / 文章 ID 必须为正整数")
    if len(article_ids) != len(set(article_ids)):
        raise ValueError("Article ids must be unique / 文章 ID 不能重复")
    return article_ids


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
    cover_file: str | None = Field(
        default=None,
        max_length=PAGE_FILE_MAX_LENGTH,
        description="Reserved cover file reference / 预留封面文件引用",
    )
    preface_file: str | None = Field(
        default=None,
        max_length=PAGE_FILE_MAX_LENGTH,
        description="Reserved preface file reference / 预留前言文件引用",
    )
    afterword_file: str | None = Field(
        default=None,
        max_length=PAGE_FILE_MAX_LENGTH,
        description="Reserved afterword file reference / 预留后记文件引用",
    )
    acknowledgement_file: str | None = Field(
        default=None,
        max_length=PAGE_FILE_MAX_LENGTH,
        description="Reserved acknowledgement file reference / 预留致谢文件引用",
    )
    back_cover_file: str | None = Field(
        default=None,
        max_length=PAGE_FILE_MAX_LENGTH,
        description="Reserved back-cover file reference / 预留封底文件引用",
    )
    layout_sections: list[BookLayoutSection] | None = Field(
        default=None,
        description="Ordered book layout sections / 有序书籍板块结构",
    )

    @field_validator("layout_sections")
    @classmethod
    def validate_layout_sections(
        cls, sections: list[BookLayoutSection] | None
    ) -> list[BookLayoutSection] | None:
        return _validate_layout_sections(sections)

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
    cover_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    preface_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    afterword_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    acknowledgement_file: str | None = Field(
        default=None, max_length=PAGE_FILE_MAX_LENGTH
    )
    back_cover_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    layout_sections: list[BookLayoutSection] | None = None

    @field_validator("title", "owner_name", "number_mode", "status")
    @classmethod
    def required_fields_cannot_be_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("field cannot be null / 字段不能为空")
        return value

    @field_validator("layout_sections")
    @classmethod
    def validate_layout_sections(
        cls, sections: list[BookLayoutSection] | None
    ) -> list[BookLayoutSection] | None:
        return _validate_layout_sections(sections)

class BookResponse(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invite_code: InviteCode = Field(description="Invitation code / 邀请码")
    author_count: int = Field(default=0, ge=0, description="Author count / 作者数量")
    layout_article_order: list[int] | None = Field(
        default=None,
        description="Ordered approved article ids / 有序的审核通过文章 ID",
    )
    created_at: datetime
    updated_at: datetime

    @field_validator("layout_article_order")
    @classmethod
    def validate_article_order(cls, article_ids: list[int] | None) -> list[int] | None:
        return _validate_article_order(article_ids)


class BookCreateData(BookCreate):
    """Service-enriched data passed from the service to the repository."""

    invite_code: InviteCode
    created_at: datetime
    updated_at: datetime


class BookUpdateData(BookUpdate):
    """Service-enriched update passed from the service to the repository."""

    updated_at: datetime
