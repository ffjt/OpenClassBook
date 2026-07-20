from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ExportBookInfo(BaseModel):
    id: int
    title: str
    description: str | None
    owner_name: str
    created_at: datetime
    updated_at: datetime


class ExportTemplateInfo(BaseModel):
    font: str
    title_font: str = "sans-serif"
    font_size: float
    page_size: str
    page_margin: str
    allow_images: bool
    image_align: str
    image_width: float
    numbering_style: str
    line_height: float
    title_size: float
    title_spacing: float = Field(default=12, ge=0, le=96)
    title_align: str
    title_bold: bool
    subtitle_mode: str
    fixed_subtitle: str
    subtitle_align: str
    body_justify: bool
    first_line_indent: float
    page_number_position: str
    custom_page_width: float
    custom_page_height: float
    template_id: str = ""
    theme_color: str = "#202124"
    accent_color: str = "#1f2937"
    background_color: str = "#fffefa"
    columns: int = Field(default=1, ge=1, le=2)
    article_page_mode: str = "single"
    show_header: bool = False
    header_text: str = ""
    show_footer: bool = True
    footer_text: str = "OpenClassBook"
    footer_font: str = "sans-serif"
    footer_size: float = Field(default=8, ge=6, le=18)
    chrome_surface_opacity: float = Field(default=70, ge=0, le=100)
    show_author_meta: bool = True
    image_radius: float = Field(default=0, ge=0, le=24)
    image_border: bool = True
    quote_style: bool = True
    title_surface_enabled: bool = False
    title_surface_opacity: float = Field(default=70, ge=0, le=100)


class ExportStats(BaseModel):
    article_count: int = Field(ge=0)
    estimated_page_count: int = Field(ge=0)
    image_count: int = Field(ge=0)
    last_updated: datetime


class ExportSection(BaseModel):
    id: str
    kind: Literal["page", "articles"]
    preset: str | None
    label_en: str
    label_zh: str
    included: bool = True
    has_source: bool


class ExportPreviewPage(BaseModel):
    page_number: int = Field(gt=0)
    kind: Literal["page", "article"]
    label_en: str
    label_zh: str
    is_placeholder: bool = True


class ExportPreviewResponse(BaseModel):
    book: ExportBookInfo
    template: ExportTemplateInfo
    stats: ExportStats
    sections: list[ExportSection]
    preview_pages: list[ExportPreviewPage]
    warnings: list[str]
    warnings_zh: list[str]
    can_export: bool


class ExportResponse(BaseModel):
    status: Literal["success"] = "success"
    task_id: str
    download_url: str
    page_count: int = Field(gt=0)
    generated_at: datetime
