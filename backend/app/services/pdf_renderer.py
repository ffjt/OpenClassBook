import base64
import binascii
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
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
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


class PublicationImage(Flowable):
    """Image flowable with optional publication-safe clipping and border."""

    def __init__(
        self,
        image: Image,
        *,
        radius: float,
        border: bool,
        border_color: str,
    ) -> None:
        super().__init__()
        self.image = image
        self.drawWidth = image.drawWidth
        self.drawHeight = image.drawHeight
        self.radius = max(0, radius)
        self.border = border
        self.border_color = border_color
        self.hAlign = image.hAlign

    def wrap(
        self,
        _available_width: float,
        _available_height: float,
    ) -> tuple[float, float]:
        return self.drawWidth, self.drawHeight

    def draw(self) -> None:
        canvas = self.canv
        canvas.saveState()
        if self.radius:
            path = canvas.beginPath()
            path.roundRect(0, 0, self.drawWidth, self.drawHeight, self.radius)
            canvas.clipPath(path, stroke=0, fill=0)
        self.image.drawOn(canvas, 0, 0)
        canvas.restoreState()
        if self.border:
            canvas.saveState()
            canvas.setStrokeColor(colors.HexColor(self.border_color))
            canvas.setLineWidth(0.6)
            canvas.roundRect(
                0,
                0,
                self.drawWidth,
                self.drawHeight,
                self.radius,
                stroke=1,
                fill=0,
            )
            canvas.restoreState()


class QuoteParagraph(Paragraph):
    """A splittable paragraph with the same left accent rule as the previews."""

    def draw(self) -> None:
        canvas = self.canv
        canvas.saveState()
        canvas.setStrokeColor(self.style.borderColor)
        canvas.setLineWidth(1.5)
        canvas.line(0, 0, 0, self.height)
        canvas.restoreState()
        super().draw()


def _append_normal_paragraph(
    paragraphs: list[Paragraph],
    normal_lines: list[str],
    style: ParagraphStyle,
) -> None:
    if normal_lines:
        paragraphs.append(
            Paragraph(
                escape("\n".join(normal_lines)).replace("\n", "<br/>"),
                style,
            )
        )
        normal_lines.clear()


class PdfRenderer:
    """ReportLab-backed renderer kept independent from API and persistence."""

    def render(
        self,
        document: PdfDocumentData,
        destination: Path,
        *,
        include_page_numbers: bool = True,
        include_page_chrome: bool = True,
    ) -> int:
        destination.parent.mkdir(parents=True, exist_ok=True)
        body_font, body_bold_font = _register_fonts(document.template.font)
        title_font, title_bold_font = _register_fonts(document.template.title_font)
        chrome_font, chrome_bold_font = _register_fonts("sans-serif")
        page_size = _page_size(document.template)
        margin = {
            "narrow": 15 * mm,
            "normal": 22 * mm,
            "wide": 28 * mm,
        }.get(document.template.page_margin, 22 * mm)
        column_gap = 6 * mm
        column_width = (page_size[0] - 2 * margin - column_gap) / 2
        column_height = page_size[1] - 2 * margin
        use_columns = document.template.columns == 2 and all(
            section.get("kind") == "articles" for section in document.sections
        )
        if use_columns:
            pdf = BaseDocTemplate(
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
            pdf.addPageTemplates(
                PageTemplate(
                    id="magazine",
                    frames=[
                        Frame(
                            margin,
                            margin,
                            column_width,
                            column_height,
                            id="magazine-left",
                            leftPadding=0,
                            rightPadding=0,
                            topPadding=0,
                            bottomPadding=0,
                        ),
                        Frame(
                            margin + column_width + column_gap,
                            margin,
                            column_width,
                            column_height,
                            id="magazine-right",
                            leftPadding=0,
                            rightPadding=0,
                            topPadding=0,
                            bottomPadding=0,
                        ),
                    ],
                )
            )
        else:
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
        styles = _styles(
            document.template,
            body_font,
            body_bold_font,
            title_font,
            title_bold_font,
        )
        story: list[Any] = []
        for section in document.sections:
            if story:
                story.append(
                    PageBreak()
                    if not use_columns
                    else Spacer(1, 4 * mm)
                )
            if section["kind"] == "articles":
                self._append_articles(
                    story,
                    document,
                    styles,
                    column_width if use_columns else pdf.width,
                    column_height if use_columns else pdf.height,
                )
            else:
                self._append_page_section(story, section, document, styles)

        page_count = 0

        def draw_page_chrome(canvas: Any, doc: Any) -> None:
            nonlocal page_count
            page_count = max(page_count, doc.page)
            canvas.saveState()
            if include_page_chrome and document.template.show_header:
                header_y = page_size[1] - margin + 5
                canvas.setStrokeColor(colors.HexColor(document.template.accent_color))
                canvas.setLineWidth(1.2)
                canvas.line(margin, header_y - 4, page_size[0] - margin, header_y - 4)
                canvas.setFillColor(colors.HexColor(document.template.theme_color))
                canvas.setFont(chrome_bold_font, 8)
                canvas.drawString(
                    margin,
                    header_y + 1,
                    document.template.header_text or document.book.title,
                )
            if include_page_chrome and document.template.show_footer:
                footer_y = max(8, margin / 2)
                canvas.setFillColor(colors.HexColor(document.template.theme_color))
                canvas.setFont(chrome_font, 8)
                canvas.drawString(
                    margin,
                    footer_y,
                    document.template.footer_text or "OpenClassBook",
                )
            position = document.template.page_number_position
            if not include_page_numbers or position == "hidden" or doc.page == 1:
                canvas.restoreState()
                return
            canvas.setFillColor(colors.HexColor(document.template.accent_color))
            canvas.setFont(chrome_font, 9)
            x = page_size[0] / 2 if position == "center" else page_size[0] - margin
            if position == "center":
                canvas.drawCentredString(x, max(8, margin / 2), str(doc.page))
            else:
                canvas.drawRightString(x, max(8, margin / 2), str(doc.page))
            canvas.restoreState()

        if use_columns:
            pdf.pageTemplates[0].onPage = draw_page_chrome
            pdf.build(story)
        else:
            pdf.build(
                story,
                onFirstPage=draw_page_chrome,
                onLaterPages=draw_page_chrome,
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
            if index and document.template.article_page_mode == "single":
                story.append(PageBreak())

            paragraphs: list[Paragraph] = []
            normal_lines: list[str] = []

            for line in article.content.strip().splitlines():
                stripped = line.lstrip()
                if document.template.quote_style and stripped.startswith(">"):
                    _append_normal_paragraph(
                        paragraphs,
                        normal_lines,
                        styles["body"],
                    )
                    paragraphs.append(
                        QuoteParagraph(
                            escape(stripped[1:].lstrip()),
                            styles["quote"],
                        )
                    )
                elif line.strip():
                    normal_lines.append(line)
                else:
                    _append_normal_paragraph(
                        paragraphs,
                        normal_lines,
                        styles["body"],
                    )
            _append_normal_paragraph(paragraphs, normal_lines, styles["body"])

            image: Flowable | None = None
            if (
                document.template.allow_images
                and document.template.image_width > 0
                and article.image
            ):
                image = _article_image(
                    article.image,
                    content_width * document.template.image_width / 100,
                    content_height * 0.34,
                    radius=document.template.image_radius,
                    border=document.template.image_border,
                    border_color=document.template.accent_color,
                )
                if image is not None:
                    image.hAlign = {
                        "left": "LEFT",
                        "center": "CENTER",
                        "right": "RIGHT",
                    }.get(document.template.image_align, "CENTER")

            opening: list[Any] = []
            if index and document.template.article_page_mode == "flow":
                accent = colors.HexColor(document.template.accent_color)
                opening.append(
                    HRFlowable(
                        width="100%",
                        thickness=0.45,
                        color=colors.Color(
                            accent.red,
                            accent.green,
                            accent.blue,
                            alpha=0.35,
                        ),
                        spaceBefore=18,
                        spaceAfter=10,
                    )
                )
            if article.number and document.template.numbering_style != "hidden":
                opening.extend(
                    [
                        Paragraph(escape(article.number), styles["number"]),
                        Spacer(1, 4),
                    ]
                )
            opening.append(Paragraph(escape(article.title), styles["article_title"]))
            subtitle = (
                document.template.fixed_subtitle
                if document.template.subtitle_mode == "fixed"
                else article.subtitle
                if document.template.subtitle_mode == "free"
                else ""
            )
            if subtitle:
                opening.extend(
                    [Spacer(1, 4), Paragraph(escape(subtitle), styles["subtitle"])]
                )
            author = document.author_names.get(article.author_id)
            if author and document.template.show_author_meta:
                opening.extend(
                    [
                        Spacer(1, 3),
                        Paragraph(escape(author), styles["author"]),
                    ]
                )
            if image is not None or paragraphs:
                opening.append(Spacer(1, document.template.title_spacing))
            if image is not None:
                opening.append(image)
                if paragraphs:
                    opening.append(Spacer(1, max(6, document.template.font_size * 0.8)))
            if paragraphs:
                opening.append(paragraphs[0])

            story.append(KeepTogether(opening))
            paragraph_gap = (
                0
                if document.template.first_line_indent > 0
                else max(4, document.template.font_size * 0.45)
            )
            for paragraph in paragraphs[1:]:
                if paragraph_gap:
                    story.append(Spacer(1, paragraph_gap))
                story.append(paragraph)


def _styles(
    template: ExportTemplateInfo,
    body_font: str,
    body_bold_font: str,
    title_font: str,
    title_bold_font: str,
) -> dict[str, ParagraphStyle]:
    alignment = {"left": TA_LEFT, "center": TA_CENTER, "right": TA_RIGHT}
    body_alignment = TA_JUSTIFY if template.body_justify else TA_LEFT
    theme_color = colors.HexColor(template.theme_color)
    accent_color = colors.HexColor(template.accent_color)
    return {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            fontName=title_bold_font if template.title_bold else title_font,
            fontSize=max(template.title_size * 1.35, 28),
            leading=max(template.title_size * 1.7, 36),
            alignment=TA_CENTER,
            textColor=theme_color,
            wordWrap="CJK",
        ),
        "cover_description": ParagraphStyle(
            "CoverDescription",
            fontName=body_font,
            fontSize=max(template.font_size, 11),
            leading=max(template.font_size * template.line_height, 17),
            alignment=TA_CENTER,
            textColor=theme_color,
            wordWrap="CJK",
        ),
        "cover_owner": ParagraphStyle(
            "CoverOwner",
            fontName=body_font,
            fontSize=11,
            leading=16,
            alignment=TA_CENTER,
            textColor=theme_color,
            wordWrap="CJK",
        ),
        "section_title": ParagraphStyle(
            "SectionTitle",
            fontName=title_bold_font,
            fontSize=max(template.title_size, 22),
            leading=max(template.title_size * 1.4, 30),
            alignment=TA_CENTER,
            wordWrap="CJK",
        ),
        "section_note": ParagraphStyle(
            "SectionNote",
            fontName=body_font,
            fontSize=10,
            leading=15,
            alignment=TA_CENTER,
            textColor=accent_color,
            wordWrap="CJK",
        ),
        "number": ParagraphStyle(
            "ArticleNumber",
            fontName=body_bold_font,
            fontSize=max(template.font_size * 0.8, 9),
            leading=max(template.font_size, 12),
            alignment=alignment.get(template.title_align, TA_CENTER),
            textColor=accent_color,
            wordWrap="CJK",
        ),
        "article_title": ParagraphStyle(
            "ArticleTitle",
            fontName=title_bold_font if template.title_bold else title_font,
            fontSize=template.title_size,
            leading=max(template.title_size * 1.18, template.title_size + 3),
            alignment=alignment.get(template.title_align, TA_CENTER),
            wordWrap="CJK",
        ),
        "subtitle": ParagraphStyle(
            "ArticleSubtitle",
            fontName=title_font,
            fontSize=max(template.title_size * 0.5, 10),
            leading=max(template.title_size * 0.65, 13),
            alignment=alignment.get(template.subtitle_align, TA_CENTER),
            textColor=colors.HexColor("#73777f"),
            wordWrap="CJK",
        ),
        "author": ParagraphStyle(
            "ArticleAuthor",
            fontName=body_bold_font,
            fontSize=max(template.font_size * 0.82, 9),
            leading=max(template.font_size, 12),
            alignment=alignment.get(template.title_align, TA_CENTER),
            textColor=theme_color,
            wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "ArticleBody",
            fontName=body_font,
            fontSize=template.font_size,
            leading=template.font_size * template.line_height,
            alignment=body_alignment,
            firstLineIndent=template.font_size * template.first_line_indent,
            textColor=theme_color,
            wordWrap="CJK",
            allowWidows=0,
            allowOrphans=0,
        ),
        "quote": ParagraphStyle(
            "ArticleQuote",
            parent=ParagraphStyle(
                "ArticleQuoteBase",
                fontName=body_font,
                fontSize=template.font_size,
                leading=template.font_size * template.line_height,
            ),
            leftIndent=8,
            borderPadding=0,
            borderWidth=0,
            borderColor=accent_color,
            backColor=None,
            textColor=theme_color,
            wordWrap="CJK",
            allowWidows=0,
            allowOrphans=0,
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


def _article_image(
    value: str,
    max_width: float,
    max_height: float,
    *,
    radius: float,
    border: bool,
    border_color: str,
) -> Flowable | None:
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
    return PublicationImage(
        image,
        radius=radius,
        border=border,
        border_color=border_color,
    )


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
