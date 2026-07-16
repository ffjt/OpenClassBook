import base64
import binascii
import re
from dataclasses import dataclass
from html import escape
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, A5
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

from app.models.article import Article
from app.models.book import Book
from app.schemas.export import ExportTemplateInfo

B5 = (176 * mm, 250 * mm)


@dataclass(frozen=True)
class PdfDocumentData:
    book: Book
    articles: list[Article]
    author_names: dict[int, str]
    sections: list[dict[str, Any]]
    template: ExportTemplateInfo


class PdfRenderer:
    """ReportLab-backed renderer kept independent from API and persistence."""

    def render(
        self,
        document: PdfDocumentData,
        destination: Path,
        *,
        include_page_numbers: bool = True,
    ) -> int:
        destination.parent.mkdir(parents=True, exist_ok=True)
        normal_font, bold_font = _register_fonts(document.template.font)
        page_size = _page_size(document.template)
        margin = {
            "narrow": 15 * mm,
            "normal": 22 * mm,
            "wide": 28 * mm,
        }.get(document.template.page_margin, 22 * mm)
        pdf = SimpleDocTemplate(
            str(destination),
            pagesize=page_size,
            leftMargin=margin,
            rightMargin=margin,
            topMargin=margin,
            bottomMargin=margin,
            title=document.book.title,
            author=document.book.owner_name,
            creator="OpenClassBook",
        )
        styles = _styles(document.template, normal_font, bold_font)
        story: list[Any] = []
        for section in document.sections:
            if story:
                story.append(PageBreak())
            if section["kind"] == "articles":
                self._append_articles(story, document, styles, pdf.width, pdf.height)
            else:
                self._append_page_section(story, section, document, styles)

        page_count = 0

        def draw_page_number(canvas: Any, doc: Any) -> None:
            nonlocal page_count
            page_count = max(page_count, doc.page)
            position = document.template.page_number_position
            if not include_page_numbers or position == "hidden" or doc.page == 1:
                return
            canvas.saveState()
            canvas.setFillColor(colors.HexColor("#5f6368"))
            canvas.setFont(normal_font, 9)
            x = page_size[0] / 2 if position == "center" else page_size[0] - margin
            if position == "center":
                canvas.drawCentredString(x, margin / 2, str(doc.page))
            else:
                canvas.drawRightString(x, margin / 2, str(doc.page))
            canvas.restoreState()

        pdf.build(
            story,
            onFirstPage=draw_page_number,
            onLaterPages=draw_page_number,
        )
        return page_count

    def _append_page_section(
        self,
        story: list[Any],
        section: dict[str, Any],
        document: PdfDocumentData,
        styles: dict[str, ParagraphStyle],
    ) -> None:
        preset = section.get("preset")
        label = _section_label(section)
        if preset == "cover":
            story.extend(
                [
                    Spacer(1, 58 * mm),
                    Paragraph(escape(document.book.title), styles["cover_title"]),
                    Spacer(1, 12 * mm),
                    Paragraph(
                        escape(document.book.description or "OpenClassBook"),
                        styles["cover_description"],
                    ),
                    Spacer(1, 45 * mm),
                    Paragraph(
                        escape(document.book.owner_name),
                        styles["cover_owner"],
                    ),
                ]
            )
            return
        if preset == "back_cover":
            story.extend(
                [
                    Spacer(1, 75 * mm),
                    Paragraph(escape(document.book.title), styles["section_title"]),
                    Spacer(1, 8 * mm),
                    Paragraph("OpenClassBook", styles["section_note"]),
                ]
            )
            return

        story.extend(
            [
                Spacer(1, 24 * mm),
                Paragraph(escape(label), styles["section_title"]),
                Spacer(1, 8 * mm),
            ]
        )
        if section.get("file"):
            file_name = str(section["file"]).replace("\\", "/").split("/")[-1]
            story.append(Paragraph(escape(file_name), styles["section_note"]))

    def _append_articles(
        self,
        story: list[Any],
        document: PdfDocumentData,
        styles: dict[str, ParagraphStyle],
        content_width: float,
        content_height: float,
    ) -> None:
        for index, article in enumerate(document.articles):
            if index:
                story.append(PageBreak())
            if article.number and document.template.numbering_style != "hidden":
                story.append(Paragraph(escape(article.number), styles["number"]))
                story.append(Spacer(1, 3 * mm))
            story.append(Paragraph(escape(article.title), styles["article_title"]))
            subtitle = (
                document.template.fixed_subtitle
                if document.template.subtitle_mode == "fixed"
                else article.subtitle
                if document.template.subtitle_mode == "free"
                else ""
            )
            if subtitle:
                story.append(Paragraph(escape(subtitle), styles["subtitle"]))
            author = document.author_names.get(article.author_id)
            if author:
                story.append(Spacer(1, 3 * mm))
                story.append(Paragraph(escape(author), styles["author"]))
            story.append(Spacer(1, 8 * mm))
            if (
                document.template.allow_images
                and document.template.image_width > 0
                and article.image
            ):
                image = _article_image(
                    article.image,
                    content_width * document.template.image_width / 100,
                    content_height * 0.42,
                )
                if image is not None:
                    image.hAlign = {
                        "left": "LEFT",
                        "center": "CENTER",
                        "right": "RIGHT",
                    }.get(document.template.image_align, "CENTER")
                    story.extend([image, Spacer(1, 6 * mm)])
            paragraphs = re.split(r"\n\s*\n", article.content.strip())
            for paragraph in paragraphs:
                if not paragraph:
                    continue
                text = escape(paragraph).replace("\n", "<br/>")
                story.extend([Paragraph(text, styles["body"]), Spacer(1, 4 * mm)])


def _styles(
    template: ExportTemplateInfo,
    normal_font: str,
    bold_font: str,
) -> dict[str, ParagraphStyle]:
    alignment = {"left": TA_LEFT, "center": TA_CENTER, "right": TA_RIGHT}
    body_alignment = TA_JUSTIFY if template.body_justify else TA_LEFT
    return {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            fontName=bold_font if template.title_bold else normal_font,
            fontSize=max(template.title_size * 1.35, 28),
            leading=max(template.title_size * 1.7, 36),
            alignment=TA_CENTER,
            textColor=colors.HexColor("#15171a"),
            wordWrap="CJK",
        ),
        "cover_description": ParagraphStyle(
            "CoverDescription",
            fontName=normal_font,
            fontSize=max(template.font_size, 11),
            leading=max(template.font_size * template.line_height, 17),
            alignment=TA_CENTER,
            textColor=colors.HexColor("#4a4f57"),
            wordWrap="CJK",
        ),
        "cover_owner": ParagraphStyle(
            "CoverOwner",
            fontName=normal_font,
            fontSize=11,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#4a4f57"),
            wordWrap="CJK",
        ),
        "section_title": ParagraphStyle(
            "SectionTitle",
            fontName=bold_font,
            fontSize=max(template.title_size, 22),
            leading=max(template.title_size * 1.4, 30),
            alignment=TA_CENTER,
            wordWrap="CJK",
        ),
        "section_note": ParagraphStyle(
            "SectionNote",
            fontName=normal_font,
            fontSize=10,
            leading=15,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#73777f"),
            wordWrap="CJK",
        ),
        "number": ParagraphStyle(
            "ArticleNumber",
            fontName=normal_font,
            fontSize=max(template.font_size * 0.8, 9),
            leading=max(template.font_size, 12),
            alignment=alignment.get(template.title_align, TA_CENTER),
            textColor=colors.HexColor("#73777f"),
            wordWrap="CJK",
        ),
        "article_title": ParagraphStyle(
            "ArticleTitle",
            fontName=bold_font if template.title_bold else normal_font,
            fontSize=template.title_size,
            leading=max(template.title_size * 1.35, template.title_size + 6),
            alignment=alignment.get(template.title_align, TA_CENTER),
            spaceAfter=template.title_size,
            wordWrap="CJK",
        ),
        "subtitle": ParagraphStyle(
            "ArticleSubtitle",
            fontName=normal_font,
            fontSize=max(template.title_size * 0.5, 10),
            leading=max(template.title_size * 0.7, 14),
            alignment=alignment.get(template.subtitle_align, TA_CENTER),
            textColor=colors.HexColor("#73777f"),
            spaceAfter=8,
            wordWrap="CJK",
        ),
        "author": ParagraphStyle(
            "ArticleAuthor",
            fontName=normal_font,
            fontSize=max(template.font_size * 0.82, 9),
            leading=max(template.font_size, 12),
            alignment=TA_CENTER,
            textColor=colors.HexColor("#5f6368"),
            wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "ArticleBody",
            fontName=normal_font,
            fontSize=template.font_size,
            leading=template.font_size * template.line_height,
            alignment=body_alignment,
            firstLineIndent=template.font_size * template.first_line_indent,
            textColor=colors.HexColor("#202124"),
            wordWrap="CJK",
        ),
    }


def _page_size(template: ExportTemplateInfo) -> tuple[float, float]:
    if template.page_size == "a5":
        return A5
    if template.page_size == "b5":
        return B5
    if template.page_size == "custom":
        return (template.custom_page_width * mm, template.custom_page_height * mm)
    return A4


def _register_fonts(requested_font: str) -> tuple[str, str]:
    key = "sans" if "sans" in requested_font.lower() else "serif"
    normal_name = f"OCB-{key}-Regular"
    bold_name = f"OCB-{key}-Bold"
    if normal_name in pdfmetrics.getRegisteredFontNames():
        return normal_name, bold_name

    font_root = Path("C:/Windows/Fonts")
    if key == "sans":
        normal_candidates = [font_root / "msyh.ttc", font_root / "simhei.ttf"]
        bold_candidates = [font_root / "msyhbd.ttc", font_root / "simhei.ttf"]
    else:
        normal_candidates = [font_root / "simsun.ttc", font_root / "simsunb.ttf"]
        bold_candidates = [font_root / "msyhbd.ttc", font_root / "simhei.ttf"]
    normal_path = _first_cjk_font(normal_candidates)
    bold_path = _first_cjk_font(bold_candidates) or normal_path
    if normal_path and bold_path:
        pdfmetrics.registerFont(TTFont(normal_name, normal_path))
        pdfmetrics.registerFont(TTFont(bold_name, bold_path))
        return normal_name, bold_name

    from reportlab.pdfbase.cidfonts import UnicodeCIDFont

    if "STSong-Light" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    return "STSong-Light", "STSong-Light"


def _first_cjk_font(candidates: list[Path]) -> Path | None:
    common_cjk = (0x4E2D, 0x6587, 0x4E66, 0x5C01)
    for path in candidates:
        if not path.exists():
            continue
        try:
            probe = TTFont("OCB-CJK-Probe", path)
        except (OSError, ValueError):
            continue
        if all(codepoint in probe.face.charToGlyph for codepoint in common_cjk):
            return path
    return None


def _article_image(value: str, max_width: float, max_height: float) -> Image | None:
    if not value.startswith("data:image/") or "," not in value:
        return None
    try:
        payload = base64.b64decode(value.split(",", 1)[1], validate=True)
        image = Image(BytesIO(payload))
    except (binascii.Error, OSError, ValueError):
        return None
    ratio = min(max_width / image.imageWidth, max_height / image.imageHeight, 1)
    image.drawWidth = image.imageWidth * ratio
    image.drawHeight = image.imageHeight * ratio
    return image


def _section_label(section: dict[str, Any]) -> str:
    labels = {
        "preface": "前言 / Preface",
        "principal_message": "校长寄语 / Principal's Message",
        "teacher_message": "教师寄语 / Teacher's Message",
        "afterword": "后记 / Afterword",
        "closing": "结语 / Closing Remarks",
        "acknowledgement": "致谢 / Acknowledgements",
    }
    return labels.get(section.get("preset"), section.get("name") or "Page")
