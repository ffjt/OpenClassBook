import re
from datetime import UTC, datetime
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
OptionalBookText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=255),
]
NumberPrefix = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=20),
]
InviteCode = Annotated[str, StringConstraints(pattern=r"^OCB-[A-Z0-9]{6}$")]
NumberMode = Literal["none", "automatic", "existing"]
ArticlePageMode = Literal["single", "flow"]
ExistingNumberMode = Literal["claim", "import"]
ClassCollectionMode = Literal["none", "fixed", "template"]
ClassValueStyle = Literal["arabic", "chinese"]
BookStatus = Literal["collecting", "reviewing", "published"]
PAGE_FILE_MAX_LENGTH = 2_048
LAYOUT_SECTION_LIMIT = 50
LayoutSectionKind = Literal["page", "articles"]
LayoutSectionPreset = Literal[
    "cover",
    "contents",
    "preface",
    "articles",
    "principal_message",
    "teacher_message",
    "afterword",
    "closing",
    "acknowledgement",
    "ending",
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
ArticleNumber = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]
NUMBER_POOL_LIMIT = 2_000
CLASS_VALUE_PLACEHOLDER = "{value}"


def validate_class_collection_configuration(
    mode: ClassCollectionMode,
    fixed_value: str | None,
    name_template: str | None,
    value_style: ClassValueStyle | None,
) -> None:
    if mode == "none" and (
        fixed_value is not None or name_template is not None or value_style is not None
    ):
        raise ValueError("Class collection is disabled / 未收集班级时不能设置班级内容")
    if mode == "fixed" and (
        not fixed_value or name_template is not None or value_style is not None
    ):
        raise ValueError(
            "Fixed class requires one class name / 统一班级必须填写班级名称"
        )
    if mode == "template":
        if fixed_value is not None or not name_template or value_style is None:
            raise ValueError("Class format is required / 必须填写班级格式")
        if name_template.count(CLASS_VALUE_PLACEHOLDER) != 1:
            raise ValueError(
                "Class format requires one placeholder / 班级格式必须包含一个填空"
            )
        if name_template == CLASS_VALUE_PLACEHOLDER:
            raise ValueError(
                "Class format must include fixed text / 班级格式必须包含固定文字"
            )


def resolve_class_name(
    mode: ClassCollectionMode,
    fixed_value: str | None,
    name_template: str | None,
    value_style: ClassValueStyle | None,
    class_value: str | None,
) -> str | None:
    validate_class_collection_configuration(
        mode, fixed_value, name_template, value_style
    )
    if mode == "none":
        return None
    if mode == "fixed":
        return fixed_value
    value = (class_value or "").strip()
    if not value:
        raise ValueError("Class value is required / 请填写班级")
    if value_style == "arabic" and re.fullmatch(r"[0-9]+", value) is None:
        raise ValueError("Use Arabic digits only / 只能填写阿拉伯数字")
    if (
        value_style == "chinese"
        and re.fullmatch(r"[零〇一二三四五六七八九十百千万两廿卅]+", value) is None
    ):
        raise ValueError("Use Chinese numerals only / 只能填写中文数字")
    resolved = name_template.replace(CLASS_VALUE_PLACEHOLDER, value)
    if len(resolved) > 120:
        raise ValueError("Class name is too long / 班级名称过长")
    return resolved


class BookLayoutSection(BaseModel):
    id: LayoutSectionId
    kind: LayoutSectionKind
    preset: LayoutSectionPreset | None = None
    name: LayoutSectionName | None = None
    file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    hidden: bool = False
    show_author: bool = True
    show_class: bool = False

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
    for preset, label in (("cover", "cover"), ("back_cover", "back cover")):
        matches = [section for section in sections if section.preset == preset]
        if len(matches) != 1 or matches[0].kind != "page":
            raise ValueError(
                f"Book must contain exactly one {label} section / "
                f"书籍必须且只能包含一个{'封面' if preset == 'cover' else '封底'}板块"
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


def validate_numbering_configuration(
    number_mode: NumberMode,
    existing_number_mode: ExistingNumberMode | None,
    number_pool: list[str],
) -> None:
    if len(number_pool) != len(set(number_pool)):
        raise ValueError("Article numbers must be unique / 文章编号不能重复")
    if number_mode != "existing" and existing_number_mode is not None:
        raise ValueError(
            "Only existing-number books can choose a claim method / "
            "只有已有编号模式可以选择认领方式"
        )
    if number_mode == "existing" and existing_number_mode is None:
        raise ValueError(
            "Existing-number books require a claim method / "
            "已有编号模式必须选择认领方式"
        )
    if number_mode != "existing" and number_pool:
        raise ValueError(
            "Only existing-number books can define an article-number pool / "
            "只有已有编号模式可以设置编号池"
        )
    if existing_number_mode == "claim" and number_pool:
        raise ValueError(
            "Free claiming cannot define an article-number pool / "
            "自由认领模式不能设置编号池"
        )


class BookBase(BaseModel):
    title: BookTitle = Field(description="Book title / 书名")
    subtitle: OptionalBookText | None = Field(
        default=None,
        description="Optional book subtitle / 可选副标题",
    )
    description: Description | None = Field(
        default=None,
        description="Book description / 书籍简介",
    )
    owner_name: OwnerName = Field(description="Book owner / 负责人")
    school: OptionalBookText | None = Field(
        default=None,
        description="Optional school / 可选学校",
    )
    publisher: OptionalBookText | None = Field(
        default=None,
        description="Optional publisher / 可选出版社",
    )
    appearance_metadata: dict[str, str] | None = Field(
        default=None,
        description="Publication appearance metadata / 出版外观元数据",
    )
    submission_enabled: bool = Field(
        default=True,
        description="Accept submissions / 是否接收投稿",
    )
    submission_deadline: datetime | None = Field(
        default=None,
        description="Submission deadline / 投稿截止时间",
    )
    allow_multiple_articles: bool = Field(
        default=True,
        description="Allow multiple articles per author / 允许作者创建多篇文章",
    )
    limit_articles_per_author: bool = Field(
        default=True,
        description="Apply a per-author article limit / 是否限制每位作者投稿数量",
    )
    max_articles_per_author: int = Field(
        default=5,
        ge=1,
        le=100,
        description="Maximum articles per author / 每位作者最多投稿数量",
    )
    allow_edit_after_submit: bool = Field(
        default=True,
        description="Allow editing submitted articles / 允许修改已提交文章",
    )
    allow_delete_article: bool = Field(
        default=True,
        description="Allow authors to delete articles / 允许作者删除文章",
    )
    class_collection_mode: ClassCollectionMode = Field(
        default="none",
        description="Class collection mode / 班级收集方式",
    )
    class_fixed_value: OptionalBookText | None = Field(
        default=None,
        description="Unified class name / 统一规定的班级",
    )
    class_name_template: OptionalBookText | None = Field(
        default=None,
        description="Class fill-in format using {value} / 使用 {value} 的班级填空格式",
    )
    class_value_style: ClassValueStyle | None = Field(
        default=None,
        description="Allowed fill-in numeral style / 填空数字样式",
    )
    invite_enabled: bool = Field(
        default=True,
        description="Accept new authors / 是否接受新作者加入",
    )
    number_mode: NumberMode = Field(
        default="none",
        description="Article numbering mode / 文章编号模式",
    )
    existing_number_mode: ExistingNumberMode | None = Field(
        default=None,
        description="Existing-number claim method / 已有编号认领方式",
    )
    number_pool: list[ArticleNumber] = Field(
        default_factory=list,
        max_length=NUMBER_POOL_LIMIT,
        description="Claimable article numbers / 可认领的文章编号",
    )
    number_prefix: NumberPrefix = Field(
        default="",
        description="Article number prefix / 编号前缀",
    )
    number_digits: int = Field(
        default=3,
        ge=1,
        le=8,
        description="Article number digits / 编号位数",
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
    layout_article_page_mode: ArticlePageMode = Field(
        default="single",
        description="Article pagination mode / 文章分页方式",
    )

    @field_validator("layout_sections")
    @classmethod
    def validate_layout_sections(
        cls, sections: list[BookLayoutSection] | None
    ) -> list[BookLayoutSection] | None:
        return _validate_layout_sections(sections)


class BookCreate(BookBase):
    @model_validator(mode="after")
    def validate_numbering(self) -> "BookCreate":
        validate_numbering_configuration(
            self.number_mode,
            self.existing_number_mode,
            self.number_pool,
        )
        validate_class_collection_configuration(
            self.class_collection_mode,
            self.class_fixed_value,
            self.class_name_template,
            self.class_value_style,
        )
        return self


class BookUpdate(BaseModel):
    title: BookTitle | None = Field(default=None, description="Book title / 书名")
    subtitle: OptionalBookText | None = Field(default=None)
    description: Description | None = Field(
        default=None,
        description="Book description / 书籍简介",
    )
    owner_name: OwnerName | None = Field(
        default=None,
        description="Book owner / 负责人",
    )
    school: OptionalBookText | None = Field(default=None)
    publisher: OptionalBookText | None = Field(default=None)
    appearance_metadata: dict[str, str] | None = Field(default=None)
    submission_enabled: bool | None = Field(default=None)
    submission_deadline: datetime | None = Field(default=None)
    allow_multiple_articles: bool | None = Field(default=None)
    limit_articles_per_author: bool | None = Field(default=None)
    max_articles_per_author: int | None = Field(default=None, ge=1, le=100)
    allow_edit_after_submit: bool | None = Field(default=None)
    allow_delete_article: bool | None = Field(default=None)
    class_collection_mode: ClassCollectionMode | None = Field(default=None)
    class_fixed_value: OptionalBookText | None = Field(default=None)
    class_name_template: OptionalBookText | None = Field(default=None)
    class_value_style: ClassValueStyle | None = Field(default=None)
    invite_enabled: bool | None = Field(default=None)
    number_mode: NumberMode | None = Field(
        default=None,
        description="Article numbering mode / 文章编号模式",
    )
    existing_number_mode: ExistingNumberMode | None = Field(
        default=None,
        description="Existing-number claim method / 已有编号认领方式",
    )
    number_pool: list[ArticleNumber] | None = Field(
        default=None,
        max_length=NUMBER_POOL_LIMIT,
        description="Claimable article numbers / 可认领的文章编号",
    )
    number_prefix: NumberPrefix | None = Field(default=None)
    number_digits: int | None = Field(default=None, ge=1, le=8)
    status: BookStatus | None = Field(
        default=None,
        description="Book status / 书籍状态",
    )
    setup_completed: bool | None = Field(
        default=None,
        description="First-time setup completed / 是否完成首次配置",
    )
    cover_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    preface_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    afterword_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    acknowledgement_file: str | None = Field(
        default=None, max_length=PAGE_FILE_MAX_LENGTH
    )
    back_cover_file: str | None = Field(default=None, max_length=PAGE_FILE_MAX_LENGTH)
    layout_sections: list[BookLayoutSection] | None = None
    layout_article_page_mode: ArticlePageMode | None = None

    @field_validator(
        "title",
        "owner_name",
        "submission_enabled",
        "allow_multiple_articles",
        "limit_articles_per_author",
        "max_articles_per_author",
        "allow_edit_after_submit",
        "allow_delete_article",
        "class_collection_mode",
        "invite_enabled",
        "number_mode",
        "number_pool",
        "number_prefix",
        "number_digits",
        "status",
        "setup_completed",
    )
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
    setup_completed: bool = Field(
        default=False,
        description="First-time setup completed / 是否完成首次配置",
    )
    author_count: int = Field(default=0, ge=0, description="Author count / 作者数量")
    article_count: int = Field(default=0, ge=0, description="Article count / 文章数量")
    approved_article_count: int = Field(
        default=0,
        ge=0,
        description="Approved article count / 审核通过文章数",
    )
    claimed_number_count: int = Field(
        default=0,
        ge=0,
        description="Claimed or assigned number count / 已使用编号数",
    )
    layout_article_order: list[int] | None = Field(
        default=None,
        description="Ordered approved article ids / 有序的审核通过文章 ID",
    )
    created_at: datetime
    updated_at: datetime

    @field_validator("submission_deadline", mode="before")
    @classmethod
    def normalize_submission_deadline(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value

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
