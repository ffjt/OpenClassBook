import html
import os
import re
from collections.abc import Iterable
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import nh3
from PIL import Image as PillowImage
from PIL import ImageOps
from pypdf import PageObject, PdfReader, PdfWriter, Transformation
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from xhtml2pdf import pisa

from app.schemas.export import ExportTemplateInfo
from app.services.docx_formatting import convert_docx_to_html
from app.services.docx_word_converter import convert_docx_with_word
from app.services.pdf_renderer import _page_size

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_DOCX_TAGS = {
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "strong",
    "sub",
    "sup",
    "span",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
}


class PageAssetError(Exception):
    """Raised when an uploaded publication asset cannot be rendered safely."""


@dataclass(frozen=True)
class RenderedAsset:
    path: Path
    page_count: int
    image_count: int = 0
    warnings: tuple[str, ...] = ()
    warnings_zh: tuple[str, ...] = ()


class PageAssetRenderer:
    """Convert one stored DOCX, PDF, or image into a PDF fragment."""

    def render(
        self,
        source: Path,
        template: ExportTemplateInfo,
        destination: Path,
        *,
        prefer_native_docx: bool = True,
    ) -> RenderedAsset:
        destination.parent.mkdir(parents=True, exist_ok=True)
        extension = source.suffix.lower()
        try:
            if extension == ".docx":
                return self._render_docx(
                    source,
                    template,
                    destination,
                    prefer_native=prefer_native_docx,
                )
            if extension == ".pdf":
                return self._render_pdf(source, destination)
            if extension in IMAGE_EXTENSIONS:
                return self._render_image(source, template, destination)
        except PageAssetError:
            destination.unlink(missing_ok=True)
            raise
        except Exception as error:
            destination.unlink(missing_ok=True)
            raise PageAssetError from error
        raise PageAssetError

    def _render_pdf(self, source: Path, destination: Path) -> RenderedAsset:
        reader = PdfReader(source, strict=False)
        if reader.is_encrypted or not reader.pages:
            raise PageAssetError
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        with destination.open("wb") as output:
            writer.write(output)
        return RenderedAsset(destination, len(reader.pages))

    def _render_image(
        self,
        source: Path,
        template: ExportTemplateInfo,
        destination: Path,
    ) -> RenderedAsset:
        with PillowImage.open(source) as opened:
            opened.seek(0)
            image = ImageOps.exif_transpose(opened)
            image.load()
            if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
                rgba = image.convert("RGBA")
                flattened = PillowImage.new("RGB", rgba.size, "white")
                flattened.paste(rgba, mask=rgba.getchannel("A"))
                image = flattened
            else:
                image = image.convert("RGB")
            encoded = BytesIO()
            image.save(encoded, format="PNG")
            width, height = image.size

        page_width, page_height = _page_size(template)
        scale = min(page_width / width, page_height / height)
        draw_width = width * scale
        draw_height = height * scale
        output = canvas.Canvas(str(destination), pagesize=(page_width, page_height))
        output.setFillColor(colors.white)
        output.rect(0, 0, page_width, page_height, fill=1, stroke=0)
        output.drawImage(
            ImageReader(encoded),
            (page_width - draw_width) / 2,
            (page_height - draw_height) / 2,
            width=draw_width,
            height=draw_height,
            preserveAspectRatio=True,
            mask="auto",
        )
        output.showPage()
        output.save()
        return RenderedAsset(destination, 1, image_count=1)

    def _render_docx(
        self,
        source: Path,
        template: ExportTemplateInfo,
        destination: Path,
        *,
        prefer_native: bool,
    ) -> RenderedAsset:
        native = convert_docx_with_word(source, destination) if prefer_native else None
        if native and native.converted:
            reader = PdfReader(destination, strict=False)
            return RenderedAsset(
                destination,
                len(reader.pages),
                image_count=_docx_image_count(source),
            )

        result = convert_docx_to_html(source)
        class_attributes = {
            tag: {"class"} for tag in ALLOWED_DOCX_TAGS if tag != "br"
        }
        class_attributes["br"] = {"class"}
        class_attributes["a"].add("href")
        class_attributes["img"].update({"alt", "src"})
        class_attributes["td"].update({"colspan", "rowspan"})
        class_attributes["th"].update({"colspan", "rowspan"})
        fragment = nh3.clean(
            result.value,
            tags=ALLOWED_DOCX_TAGS,
            clean_content_tags={"embed", "iframe", "object", "script", "style"},
            attributes=class_attributes,
            attribute_filter=_filter_docx_attribute,
            url_schemes={"data", "http", "https", "mailto"},
            url_relative="deny",
        )
        plain_text = html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()
        if not plain_text and "<img" not in fragment:
            raise PageAssetError

        page_width, page_height = _page_size(template)
        markup = _docx_markup(
            fragment,
            template,
            page_width,
            page_height,
            result.css,
        )
        with destination.open("wb") as output:
            status = pisa.CreatePDF(
                markup,
                dest=output,
                encoding="utf-8",
                raise_exception=False,
            )
        if status.err:
            raise PageAssetError
        page_count = len(PdfReader(destination, strict=False).pages)
        if page_count == 0:
            raise PageAssetError
        warnings: tuple[str, ...] = ()
        warnings_zh: tuple[str, ...] = ()
        if native and native.attempted:
            warnings = (
                "Microsoft Word conversion failed; "
                "the compatible DOCX renderer was used.",
            )
            warnings_zh = (
                "Microsoft Word 转换失败，已改用兼容 DOCX 渲染器。",
            )
        if result.messages:
            warnings += ("Some Word formatting was normalized for publication.",)
            warnings_zh += ("部分 Word 格式已按出版模板标准化。",)
        if warnings:
            return RenderedAsset(
                destination,
                page_count,
                image_count=result.value.count("<img"),
                warnings=warnings,
                warnings_zh=warnings_zh,
            )
        return RenderedAsset(
            destination,
            page_count,
            image_count=result.value.count("<img"),
        )


def assemble_fragments(
    fragments: Iterable[Path],
    destination: Path,
    template: ExportTemplateInfo,
    *,
    title: str,
    author: str,
) -> int:
    """Normalize fragments, merge visual page content, and add global page numbers."""

    page_width, page_height = _page_size(template)
    writer = PdfWriter()
    for fragment in fragments:
        reader = PdfReader(fragment, strict=False)
        if reader.is_encrypted:
            raise PageAssetError
        for source_page in reader.pages:
            page_number = len(writer.pages) + 1
            target = _fit_page(source_page, page_width, page_height)
            if template.page_number_position != "hidden" and page_number > 1:
                target.merge_page(
                    _page_number_overlay(
                        page_number,
                        page_width,
                        page_height,
                        template,
                    )
                )
            writer.add_page(target)

    if not writer.pages:
        raise PageAssetError
    writer.add_metadata(
        {
            "/Title": title,
            "/Author": author,
            "/Creator": "OpenClassBook",
        }
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(f"{destination.suffix}.tmp")
    try:
        with temporary.open("wb") as output:
            writer.write(output)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return len(writer.pages)


def _fit_page(
    source: PageObject,
    target_width: float,
    target_height: float,
) -> PageObject:
    holder = PdfWriter()
    holder.add_page(source)
    source = holder.pages[0]
    source.transfer_rotation_to_content()
    box = source.cropbox
    source_width = float(box.width)
    source_height = float(box.height)
    if source_width <= 0 or source_height <= 0:
        raise PageAssetError
    scale = min(target_width / source_width, target_height / source_height)
    translate_x = (target_width - source_width * scale) / 2 - float(box.left) * scale
    translate_y = (
        (target_height - source_height * scale) / 2 - float(box.bottom) * scale
    )
    target = PageObject.create_blank_page(width=target_width, height=target_height)
    target.merge_transformed_page(
        source,
        Transformation().scale(scale).translate(translate_x, translate_y),
    )
    return target


def _page_number_overlay(
    page_number: int,
    page_width: float,
    page_height: float,
    template: ExportTemplateInfo,
) -> PageObject:
    output = BytesIO()
    overlay = canvas.Canvas(output, pagesize=(page_width, page_height))
    margin = _page_margin(template.page_margin)
    overlay.setFillColor(colors.HexColor("#5f6368"))
    overlay.setFont("Helvetica", 9)
    y = max(8, margin / 2)
    if template.page_number_position == "right":
        overlay.drawRightString(page_width - margin, y, str(page_number))
    else:
        overlay.drawCentredString(page_width / 2, y, str(page_number))
    overlay.save()
    output.seek(0)
    return PdfReader(output).pages[0]


def _docx_markup(
    fragment: str,
    template: ExportTemplateInfo,
    page_width: float,
    page_height: float,
    formatting_css: str = "",
) -> str:
    margin = _page_margin(template.page_margin)
    alignment = "justify" if template.body_justify else "left"
    image_width = max(1, min(template.image_width, 100))
    title_align = template.title_align if template.title_align in {
        "left",
        "center",
        "right",
    } else "center"
    title_weight = "bold" if template.title_bold else "normal"
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>
@page {{ size: {page_width:.3f}pt {page_height:.3f}pt; margin: {margin:.3f}pt; }}
body {{ color: #202124; font-family: STSong-Light;
  font-size: {template.font_size:.2f}pt;
  line-height: {template.line_height:.3f}; text-align: {alignment}; }}
p {{ margin: 0 0 10pt 0; text-indent: {template.first_line_indent:.2f}em; }}
h1, h2, h3, h4, h5, h6 {{ text-align: {title_align}; font-weight: {title_weight};
  margin: 12pt 0 10pt 0; page-break-after: avoid; }}
h1 {{ font-size: {template.title_size:.2f}pt; }}
h2 {{ font-size: {max(template.title_size * 0.86, template.font_size * 1.25):.2f}pt; }}
h3, h4, h5, h6 {{ font-size: {max(template.font_size * 1.1, 12):.2f}pt; }}
ul, ol {{ margin: 0 0 10pt 20pt; }}
li {{ font-family: Helvetica; }} li p {{ text-indent: 0; }}
table {{ width: 100%; border-collapse: collapse; margin: 8pt 0 12pt 0; }}
th, td {{ border: 0.5pt solid #b9bdc5; padding: 4pt; vertical-align: top; }}
img {{ display: block; width: {image_width:.2f}%; max-width: 100%;
  max-height: {page_height * 0.72:.2f}pt;
  margin: 8pt auto 12pt auto; }}
blockquote {{ border-left: 2pt solid #b9bdc5; margin: 8pt 0; padding-left: 10pt; }}
{formatting_css}
</style></head><body>{fragment}</body></html>"""


def _filter_docx_attribute(tag: str, attribute: str, value: str) -> str | None:
    if tag == "img" and attribute == "src" and not value.startswith("data:image/"):
        return None
    if attribute == "class" and not all(
        re.fullmatch(
            r"(?:docx-(?:cell|image|page-break|paragraph|run|table)(?:-\d+)?|"
            r"docx-font-(?:cjk|mono|sans|serif))",
            item,
        )
        for item in value.split()
    ):
        return None
    return value


def _docx_image_count(source: Path) -> int:
    from zipfile import ZipFile

    with ZipFile(source) as archive:
        return sum(
            name.startswith("word/media/") and not name.endswith("/")
            for name in archive.namelist()
        )


def _page_margin(value: str) -> float:
    from reportlab.lib.units import mm

    return {"narrow": 15 * mm, "normal": 22 * mm, "wide": 28 * mm}.get(
        value,
        22 * mm,
    )
