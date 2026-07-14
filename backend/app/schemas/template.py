from typing import Any

from pydantic import BaseModel, ConfigDict


class TemplateBase(BaseModel):
    title_format: dict[str, Any] | None = None
    body_format: dict[str, Any] | None = None
    image_rules: dict[str, Any] | None = None
    numbering_rules: dict[str, Any] | None = None
    page_rules: dict[str, Any] | None = None


class TemplateCreate(TemplateBase):
    book_id: int


class TemplateUpdate(TemplateBase):
    pass


class TemplateResponse(TemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: int
