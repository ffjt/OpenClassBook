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
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    Image,
    KeepTogether,
    NextPageTemplate,
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
TEMPLATE_ASSET_ROOT = (
    Path(__file__).resolve().parents[3] / "frontend" / "public" / "templates"
)


def _set_fill_color_alpha(
    target_canvas: Any,
    color: colors.Color,
    alpha: float,
) -> None:
    """Set color before alpha because ReportLab colors reset fill opacity."""
    target_canvas.setFillColor(color)
    if hasattr(target_canvas, "setFillAlpha"):
        target_canvas.setFillAlpha(alpha)


class LayeredTitleBlock(Flowable):
    """A neutral translucent title surface that keeps theme art visible beneath it."""

    def __init__(
        self,
        title: str,
        title_style: ParagraphStyle,
        subtitle: str,
        subtitle_style: ParagraphStyle,
        opacity: float,
    ) -> None:
        super().__init__()
        self.title_text = title
        self.subtitle_text = subtitle
        self.title = Paragraph(title, title_style)
        self.subtitle = Paragraph(subtitle, subtitle_style) if subtitle else None
        self.alignment = title_style.alignment
        self.opacity = max(0.0, min(1.0, opacity))
        self.horizontal_padding = 10
        self.vertical_padding = 6
        self.gap = 4 if self.subtitle else 0
        self.surface_width = 0.0
        self.content_width = 0.0
        self.title_height = 0.0
        self.subtitle_height = 0.0

    def wrap(
        self, available_width: float, available_height: float
    ) -> tuple[float, float]:
        plain_title = re.sub(r"<[^>]+>", "", self.title_text)
        title_width = pdfmetrics.stringWidth(
            plain_title,
            self.title.style.fontName,
            self.title.style.fontSize,
        )
        subtitle_width = (
            pdfmetrics.stringWidth(
                re.sub(r"<[^>]+>", "", self.subtitle_text),
                self.subtitle.style.fontName,
                self.subtitle.style.fontSize,
            )
            if self.subtitle
            else 0
        )
        self.surface_width = min(
            available_width,
            max(title_width, subtitle_width) + self.horizontal_padding * 2,
        )
        self.content_width = self.surface_width - self.horizontal_padding * 2
        _, self.title_height = self.title.wrap(self.content_width, available_height)
        if self.subtitle:
            _, self.subtitle_height = self.subtitle.wrap(
                self.content_width, available_height
            )
        self.width = available_width
        self.height = (
            self.vertical_padding * 2
            + self.title_height
            + self.gap
            + self.subtitle_height
        )
        return self.width, self.height

    def draw(self) -> None:
        if self.alignment == TA_CENTER:
            content_left = (self.width - self.content_width) / 2
        elif self.alignment == TA_RIGHT:
            content_left = self.width - self.content_width
        else:
            content_left = 0
        left = content_left - self.horizontal_padding

        self.canv.saveState()
        _set_fill_color_alpha(
            self.canv,
            colors.HexColor("#0f172a"),
            self.opacity * 0.1,
        )
        self.canv.roundRect(
            left,
            -1,
            self.surface_width,
            self.height,
            7,
            stroke=0,
            fill=1,
        )
        _set_fill_color_alpha(self.canv, colors.white, self.opacity)
        self.canv.setStrokeColor(colors.white)
        if hasattr(self.canv, "setStrokeAlpha"):
            self.canv.setStrokeAlpha(self.opacity * 0.75)
        self.canv.roundRect(
            left,
            0,
            self.surface_width,
            self.height,
            7,
            stroke=1,
            fill=1,
        )
        self.canv.restoreState()

        title_y = self.height - self.vertical_padding - self.title_height
        self.title.drawOn(self.canv, content_left, title_y)
        if self.subtitle:
            self.subtitle.drawOn(
                self.canv,
                content_left,
                self.vertical_padding,
            )


def _draw_chrome_chip(
    target_canvas: Any,
    *,
    text: str,
    x: float,
    y: float,
    font_name: str,
    font_size: float,
    surface_opacity: float,
    align: str = "left",
) -> None:
    """Draw chrome on the same translucent white surface used by titles."""
    width = pdfmetrics.stringWidth(text, font_name, font_size)
    padding_x = 4
    opacity = max(0.0, min(1.0, surface_opacity))
    if align == "center":
        left = x - width / 2 - padding_x
    elif align == "right":
        left = x - width - padding_x
    else:
        left = x - padding_x
    target_canvas.saveState()
    _set_fill_color_alpha(
        target_canvas,
        colors.HexColor("#0f172a"),
        opacity * 0.1,
    )
    target_canvas.roundRect(
        left,
        y - 3.5,
        width + padding_x * 2,
        font_size + 5,
        3,
        fill=1,
        stroke=0,
    )
    _set_fill_color_alpha(target_canvas, colors.white, opacity)
    target_canvas.setStrokeColor(colors.white)
    if hasattr(target_canvas, "setStrokeAlpha"):
        target_canvas.setStrokeAlpha(opacity * 0.75)
    target_canvas.roundRect(
        left,
        y - 2.5,
        width + padding_x * 2,
        font_size + 5,
        3,
        fill=1,
        stroke=1,
    )
    target_canvas.restoreState()


@dataclass(frozen=True)
class PdfDocumentData:
    book: Book
    articles: list[Article]
    author_names: dict[int, str]
    sections: list[dict[str, Any]]
    template: ExportTemplateInfo


class PageBackground(Flowable):
    """Zero-height full-page background drawn before the section content."""

    def __init__(self, path: Path, page_size: tuple[float, float]) -> None:
        super().__init__()
        self.path = path
        self.page_size = page_size

    def wrap(
        self, _available_width: float, _available_height: float
    ) -> tuple[float, float]:
        return 0, 0

    def drawOn(self, canvas: Any, _x: float, _y: float, _sW: float = 0) -> None:
        if not self.path.is_file():
            return
        canvas.saveState()
        canvas.drawImage(
            str(self.path),
            0,
            0,
            width=self.page_size[0],
            height=self.page_size[1],
            preserveAspectRatio=False,
            mask="auto",
        )
        canvas.restoreState()


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
        footer_font, _ = _register_fonts(document.template.footer_font)
        _, chrome_bold_font = _register_fonts("sans-serif")
        page_size = _page_size(document.template)
        size_scale = _preview_size_scale(document.template, page_size[0])
        margin_ratio = {
            "narrow": (0.08, 0.07),
            "normal": (0.11, 0.09),
            "wide": (0.15, 0.12),
        }.get(document.template.page_margin, (0.11, 0.09))
        margin_x = page_size[0] * margin_ratio[0]
        margin_y = page_size[0] * margin_ratio[1]
        column_gap = 6 * mm
        column_width = (page_size[0] - 2 * margin_x - column_gap) / 2
        column_height = page_size[1] - 2 * margin_y
        use_columns = document.template.columns == 2 and all(
            section.get("kind") == "articles" for section in document.sections
        )
        if use_columns:
            header_reserve = 12 * mm if document.template.show_header else 0
            pdf = BaseDocTemplate(
                str(destination),
                pagesize=page_size,
                leftMargin=margin_x,
                rightMargin=margin_x,
                topMargin=margin_y,
                bottomMargin=margin_y,
                title=document.book.title,
                author=document.book.owner_name,
                creator="OpenClassBook",
            )
            pdf.addPageTemplates(
                [
                    PageTemplate(
                        id="two-column-first",
                        frames=[
                            Frame(
                                margin_x,
                                margin_y,
                                column_width,
                                column_height,
                                id="two-column-left",
                                leftPadding=0,
                                rightPadding=0,
                                topPadding=header_reserve,
                                bottomPadding=0,
                            ),
                            Frame(
                                margin_x + column_width + column_gap,
                                margin_y,
                                column_width,
                                column_height,
                                id="two-column-right",
                                leftPadding=0,
                                rightPadding=0,
                                topPadding=header_reserve,
                                bottomPadding=0,
                            ),
                        ],
                    ),
                    PageTemplate(
                        id="two-column",
                        frames=[
                            Frame(
                                margin_x,
                                margin_y,
                                column_width,
                                column_height,
                                id="two-column-left",
                                leftPadding=0,
                                rightPadding=0,
                                topPadding=header_reserve,
                                bottomPadding=0,
                            ),
                            Frame(
                                margin_x + column_width + column_gap,
                                margin_y,
                                column_width,
                                column_height,
                                id="two-column-right",
                                leftPadding=0,
                                rightPadding=0,
                                topPadding=header_reserve,
                                bottomPadding=0,
                            ),
                        ],
                    ),
                ]
            )
        else:
            pdf = SimpleDocTemplate(
                str(destination),
                pagesize=page_size,
                leftMargin=margin_x,
                rightMargin=margin_x,
                topMargin=margin_y,
                bottomMargin=margin_y,
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
            size_scale,
        )
        story: list[Any] = []
        if use_columns:
            story.append(NextPageTemplate("two-column"))
        for section_index, section in enumerate(document.sections):
            if section_index:
                story.append(PageBreak() if not use_columns else Spacer(1, 4 * mm))
            if section["kind"] == "articles":
                self._append_articles(
                    story,
                    document,
                    styles,
                    column_width if use_columns else pdf.width,
                    column_height if use_columns else pdf.height,
                    size_scale,
                )
            else:
                self._append_page_section(story, section, document, styles)

        page_count = 0
        article_background = _template_asset_path(
            document.template.template_id, "article_background"
        )

        def draw_page_chrome(canvas: Any, doc: Any) -> None:
            nonlocal page_count
            page_count = max(page_count, doc.page)
            canvas.saveState()
            if document.template.background_color.lower() != "#fffefa":
                canvas.setFillColor(colors.HexColor(document.template.background_color))
                canvas.rect(0, 0, page_size[0], page_size[1], fill=1, stroke=0)
            if article_background.is_file():
                canvas.drawImage(
                    str(article_background),
                    0,
                    0,
                    width=page_size[0],
                    height=page_size[1],
                    preserveAspectRatio=False,
                    mask="auto",
                )
            canvas.restoreState()
            canvas.saveState()
            if include_page_chrome and document.template.show_header:
                header_y = page_size[1] - margin_y + 5
                canvas.setStrokeColor(colors.HexColor(document.template.accent_color))
                canvas.setLineWidth(1.2)
                canvas.line(
                    margin_x, header_y - 4, page_size[0] - margin_x, header_y - 4
                )
                canvas.setFillColor(colors.HexColor(document.template.theme_color))
                canvas.setFont(chrome_bold_font, 8)
                canvas.drawString(
                    margin_x,
                    header_y + 1,
                    document.template.header_text or document.book.title,
                )
            if include_page_chrome and document.template.show_footer:
                footer_y = max(8, margin_y / 2)
                footer_text = document.template.footer_text or "OpenClassBook"
                _draw_chrome_chip(
                    canvas,
                    text=footer_text,
                    x=margin_x,
                    y=footer_y,
                    font_name=footer_font,
                    font_size=document.template.footer_size,
                    surface_opacity=document.template.chrome_surface_opacity / 100,
                )
                canvas.setFillColor(colors.HexColor(document.template.theme_color))
                canvas.setFont(footer_font, document.template.footer_size)
                canvas.drawString(
                    margin_x,
                    footer_y,
                    footer_text,
                )
            position = document.template.page_number_position
            if not include_page_numbers or position == "hidden" or doc.page == 1:
                canvas.restoreState()
                return
            canvas.setFillColor(colors.HexColor(document.template.accent_color))
            canvas.setFont(chrome_bold_font, 10)
            x = page_size[0] / 2 if position == "center" else page_size[0] - margin_x
            page_number_label = f"{doc.page:02d}"
            _draw_chrome_chip(
                canvas,
                text=page_number_label,
                x=x,
                y=max(8, margin_y / 2),
                font_name=chrome_bold_font,
                font_size=10,
                surface_opacity=document.template.chrome_surface_opacity / 100,
                align=position,
            )
            if position == "center":
                canvas.drawCentredString(x, max(8, margin_y / 2), page_number_label)
            else:
                canvas.drawRightString(x, max(8, margin_y / 2), page_number_label)
            canvas.restoreState()

        if use_columns:
            for page_template in pdf.pageTemplates:
                page_template.onPage = draw_page_chrome
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
        asset_kind = {
            "cover": "cover",
            "back_cover": "cover_back",
            "ending": "ending",
        }.get(str(preset), "chapter")
        story.append(
            PageBackground(
                _template_asset_path(document.template.template_id, asset_kind),
                _page_size(document.template),
            )
        )
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
        size_scale: float,
    ) -> None:
        for index, article in enumerate(document.articles):
            if index and document.template.article_page_mode == "single":
                if document.template.columns == 2:
                    story.append(NextPageTemplate("two-column-first"))
                story.append(PageBreak())
                if document.template.columns == 2:
                    story.append(NextPageTemplate("two-column"))

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
                        Spacer(1, 1.5 * size_scale),
                    ]
                )
            subtitle = (
                document.template.fixed_subtitle
                if document.template.subtitle_mode == "fixed"
                else article.subtitle
                if document.template.subtitle_mode == "free"
                else ""
            )
            if document.template.title_surface_enabled:
                opening.append(
                    LayeredTitleBlock(
                        escape(article.title),
                        styles["article_title"],
                        escape(subtitle) if subtitle else "",
                        styles["subtitle"],
                        document.template.title_surface_opacity / 100,
                    )
                )
            else:
                opening.append(
                    Paragraph(escape(article.title), styles["article_title"])
                )
            if (
                subtitle
                and not document.template.title_surface_enabled
            ):
                opening.extend(
                    [
                        Spacer(1, 4 * size_scale),
                        Paragraph(escape(subtitle), styles["subtitle"]),
                    ]
                )
            author = document.author_names.get(article.author_id)
            if image is not None or paragraphs:
                opening.append(Spacer(1, document.template.title_spacing * size_scale))
            if image is not None:
                opening.append(image)
                if paragraphs:
                    opening.append(
                        Spacer(
                            1, max(6, document.template.font_size * 0.8) * size_scale
                        )
                    )
                    opening.append(paragraphs.pop(0))

            story.append(KeepTogether(opening))
            if author and document.template.show_author_meta:
                story.extend(
                    [
                        Paragraph(escape(author), styles["author"]),
                        Spacer(1, 7 * size_scale),
                    ]
                )
            paragraph_gap = (
                0
                if document.template.first_line_indent > 0
                else max(4, document.template.font_size * 0.45) * size_scale
            )
            for paragraph in paragraphs:
                if paragraph_gap:
                    story.append(Spacer(1, paragraph_gap))
                story.append(paragraph)


def _styles(
    template: ExportTemplateInfo,
    body_font: str,
    body_bold_font: str,
    title_font: str,
    title_bold_font: str,
    size_scale: float,
) -> dict[str, ParagraphStyle]:
    body_size = template.font_size * size_scale
    title_size = template.title_size * size_scale
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
            fontSize=max(body_size * 0.8, 9 * size_scale),
            leading=max(body_size, 12 * size_scale),
            alignment=alignment.get(template.title_align, TA_CENTER),
            textColor=accent_color,
            wordWrap="CJK",
        ),
        "article_title": ParagraphStyle(
            "ArticleTitle",
            fontName=title_bold_font if template.title_bold else title_font,
            fontSize=title_size,
            leading=title_size * 1.25,
            alignment=alignment.get(template.title_align, TA_CENTER),
            wordWrap="CJK",
        ),
        "subtitle": ParagraphStyle(
            "ArticleSubtitle",
            fontName=title_font,
            fontSize=max(title_size * 0.5, 12 * size_scale),
            leading=max(title_size * 0.5, 12 * size_scale) * 1.4,
            alignment=alignment.get(template.subtitle_align, TA_CENTER),
            textColor=colors.HexColor("#73777f"),
            wordWrap="CJK",
        ),
        "author": ParagraphStyle(
            "ArticleAuthor",
            fontName=body_bold_font,
            fontSize=body_size,
            leading=body_size * template.line_height,
            alignment=alignment.get(template.title_align, TA_CENTER),
            textColor=theme_color,
            wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "ArticleBody",
            fontName=body_font,
            fontSize=body_size,
            leading=body_size * template.line_height,
            alignment=body_alignment,
            firstLineIndent=body_size * template.first_line_indent,
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
                fontSize=body_size,
                leading=body_size * template.line_height,
            ),
            leftIndent=body_size * 0.7,
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


def _template_asset_path(template_id: str, asset_kind: str) -> Path:
    if not template_id:
        return TEMPLATE_ASSET_ROOT / "__none__" / f"{asset_kind}.png"
    safe_template_id = (
        template_id if re.fullmatch(r"[a-z0-9-]+", template_id) else "spring-blossom"
    )
    safe_asset_kind = asset_kind if asset_kind in {
        "cover",
        "cover_back",
        "chapter",
        "article_background",
        "ending",
    } else "article_background"
    return TEMPLATE_ASSET_ROOT / safe_template_id / f"{safe_asset_kind}.png"


def _page_size(template: ExportTemplateInfo) -> tuple[float, float]:
    if template.page_size == "a5":
        return A5
    if template.page_size == "b5":
        return B5
    if template.page_size == "custom":
        return (template.custom_page_width * mm, template.custom_page_height * mm)
    return A4


def _preview_size_scale(template: ExportTemplateInfo, page_width: float) -> float:
    preview_width = {
        "a4": 540.0,
        "a5": 440.0,
        "b5": 480.0,
    }.get(template.page_size)
    if preview_width is None:
        preview_width = min(
            560.0,
            max(360.0, (template.custom_page_width / 210.0) * 540.0),
        )
    return page_width / preview_width


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
        "chapter": "章节页 / Chapter",
        "principal_message": "校长寄语 / Principal's Message",
        "teacher_message": "教师寄语 / Teacher's Message",
        "afterword": "后记 / Afterword",
        "closing": "结语 / Closing Remarks",
        "acknowledgement": "致谢 / Acknowledgements",
        "ending": "感谢阅读 / Thank you for reading",
    }
    return labels.get(section.get("preset"), section.get("name") or "Page")
