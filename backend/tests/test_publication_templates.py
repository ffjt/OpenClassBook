import base64
import io
from pathlib import Path
from types import SimpleNamespace

import pytest
from PIL import Image as PillowImage
from pypdf import PdfReader
from pypdf.generic import ContentStream

from app.schemas.export import ExportTemplateInfo
from app.services import page_asset_renderer
from app.services.pdf_renderer import PdfDocumentData, PdfRenderer, _draw_chrome_chip


def _publication_template() -> ExportTemplateInfo:
    return ExportTemplateInfo(
        font="serif",
        font_size=10,
        page_size="a4",
        page_margin="normal",
        allow_images=False,
        image_align="center",
        image_width=80,
        numbering_style="above",
        line_height=1.35,
        title_size=20,
        title_align="left",
        title_bold=True,
        subtitle_mode="free",
        fixed_subtitle="",
        subtitle_align="left",
        body_justify=True,
        first_line_indent=0,
        page_number_position="right",
        custom_page_width=210,
        custom_page_height=297,
        theme_color="#111827",
        accent_color="#dc2626",
        columns=2,
        show_header=True,
        header_text="OPEN CLASSBOOK",
        show_footer=True,
        footer_text="Campus Edition",
        show_author_meta=True,
        quote_style=True,
    )


def _image_data_uri() -> str:
    output = io.BytesIO()
    PillowImage.new("RGB", (1200, 720), (31, 41, 55)).save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def test_export_template_has_no_publication_category() -> None:
    assert "preset" not in _publication_template().model_dump()


class _ChromeCanvasRecorder:
    def __init__(self) -> None:
        self.events: list[tuple[str, float | None]] = []
        self.fill_alphas: list[float] = []
        self.stroke_alphas: list[float] = []

    def saveState(self) -> None:  # noqa: N802 - ReportLab canvas API
        pass

    def restoreState(self) -> None:  # noqa: N802 - ReportLab canvas API
        pass

    def setFillAlpha(self, alpha: float) -> None:  # noqa: N802
        self.events.append(("fill_alpha", alpha))
        self.fill_alphas.append(alpha)

    def setStrokeAlpha(self, alpha: float) -> None:  # noqa: N802
        self.stroke_alphas.append(alpha)

    def setFillColor(self, _color: object) -> None:  # noqa: N802
        self.events.append(("fill_color", None))

    def setStrokeColor(self, _color: object) -> None:  # noqa: N802
        pass

    def roundRect(self, *_args: object, **_kwargs: object) -> None:  # noqa: N802
        pass


def test_footer_and_page_number_surface_uses_configured_opacity() -> None:
    canvas = _ChromeCanvasRecorder()

    _draw_chrome_chip(
        canvas,
        text="02",
        x=100,
        y=20,
        font_name="Helvetica-Bold",
        font_size=10,
        surface_opacity=0.35,
        align="center",
    )

    assert canvas.fill_alphas == pytest.approx([0.035, 0.35])
    assert canvas.stroke_alphas == pytest.approx([0.2625])
    assert canvas.events[:4] == [
        ("fill_color", None),
        ("fill_alpha", pytest.approx(0.035)),
        ("fill_color", None),
        ("fill_alpha", pytest.approx(0.35)),
    ]


def test_final_page_chrome_keeps_safe_font_and_uses_configured_footer_font(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested_fonts: list[str] = []

    def register_fonts(requested_font: str) -> tuple[str, str]:
        requested_fonts.append(requested_font)
        return "Helvetica", "Helvetica-Bold"

    monkeypatch.setattr(page_asset_renderer, "_register_fonts", register_fonts)

    template = _publication_template().model_copy(
        update={"footer_font": "serif"}
    )

    page_asset_renderer._page_chrome_overlay(
        1,
        595,
        842,
        template,
        "OpenClassBook",
    )

    assert requested_fonts == ["sans-serif", "serif"]


@pytest.fixture
def bilingual_flow_document() -> PdfDocumentData:
    book = SimpleNamespace(
        title="Open ClassBook / 开放班级书",
        description="Bilingual publication layout fixture / 中英双语出版排版样例",
        owner_name="Editorial team / 编辑部",
    )
    long_content = "\n\n".join(
        f"Long body line {index:02d} / 中英文长文第 {index:02d} 段。"
        for index in range(1, 15)
    )
    articles = [
        SimpleNamespace(
            number="001",
            title="LONG STORY MARKER / 中英长文",
            subtitle="",
            author_id=1,
            content=long_content,
            image=None,
        ),
        SimpleNamespace(
            number="002",
            title="IMG TITLE / 图文",
            subtitle="Image subtitle / 图片副题",
            author_id=2,
            content="IMG LEAD / 图片文章首段。",
            image=_image_data_uri(),
        ),
        SimpleNamespace(
            number="003",
            title="TIGHT / 紧凑",
            subtitle="SUBTITLE / 中英副题",
            author_id=3,
            content="BODY LEAD / 中英正文。",
            image=None,
        ),
    ]
    template = _publication_template().model_copy(
        update={
            "allow_images": True,
            "image_align": "left",
            "image_width": 100,
            "image_border": False,
            "font_size": 11,
            "line_height": 1.35,
            "title_size": 24,
            "title_align": "left",
            "subtitle_align": "left",
            "first_line_indent": 0,
            "article_page_mode": "flow",
            "show_author_meta": True,
        }
    )
    return PdfDocumentData(
        book=book,
        articles=articles,
        author_names={
            1: "Long author / 长文作者",
            2: "Image author / 图片作者",
            3: "AUTHOR / 林同学",
        },
        sections=[{"kind": "articles"}],
        template=template,
    )


def _page_layout(
    page: object,
    markers: tuple[str, ...],
) -> tuple[dict[str, tuple[float, float]], list[tuple[float, ...]]]:
    positions: dict[str, tuple[float, float]] = {}
    image_matrices: list[tuple[float, ...]] = []

    def collect_text(
        value: str,
        current_matrix: list[float],
        text_matrix: list[float],
        _font: object,
        _size: float,
    ) -> None:
        normalized = " ".join(value.split())
        for marker in markers:
            if marker not in normalized:
                continue
            x = (
                text_matrix[4] * current_matrix[0]
                + text_matrix[5] * current_matrix[2]
                + current_matrix[4]
            )
            y = (
                text_matrix[4] * current_matrix[1]
                + text_matrix[5] * current_matrix[3]
                + current_matrix[5]
            )
            positions[marker] = (float(x), float(y))

    def collect_image(
        operator: bytes,
        _operands: list[object],
        current_matrix: list[float],
        _text_matrix: list[float],
    ) -> None:
        if operator == b"Do":
            image_matrices.append(tuple(float(value) for value in current_matrix))

    page.extract_text(
        visitor_text=collect_text,
        visitor_operand_before=collect_image,
    )
    return positions, image_matrices


def test_template_renders_real_columns_and_publication_chrome(
    tmp_path: Path,
) -> None:
    book = SimpleNamespace(
        title="Two-column test",
        description="A test publication",
        owner_name="Editor",
    )
    content = "\n\n".join(
        f"Paragraph {index} with enough words to occupy a line and demonstrate "
        "two columns in the generated publication."
        for index in range(120)
    )
    article = SimpleNamespace(
        number="01",
        title="First story",
        subtitle="A subtitle",
        author_id=1,
        content=f"> A pull quote\n\n{content}",
        image=None,
    )
    destination = tmp_path / "two-column.pdf"

    page_count = PdfRenderer().render(
        PdfDocumentData(
            book=book,
            articles=[article],
            author_names={1: "Student"},
            sections=[{"kind": "articles"}],
            template=_publication_template(),
        ),
        destination,
    )

    reader = PdfReader(destination)
    assert page_count == len(reader.pages)
    assert page_count >= 2
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert "OPEN CLASSBOOK" in text
    assert "Campus Edition" in text
    assert "Student" in text
    assert "A pull quote" in text

    positions: list[int] = []
    reader.pages[0].extract_text(
        visitor_text=lambda value, _cm, tm, _font, _size: (
            positions.append(round(tm[4])) if value.strip() else None
        )
    )
    assert len(set(positions)) >= 3


def test_flowing_short_articles_fill_both_columns_before_a_new_page(
    tmp_path: Path,
) -> None:
    image = _image_data_uri()
    articles = [
        SimpleNamespace(
            number="001",
            title="First",
            subtitle="",
            author_id=1,
            content="First article content " * 30,
            image=image,
        ),
        SimpleNamespace(
            number="002",
            title="Second",
            subtitle="",
            author_id=1,
            content="Second article content " * 8,
            image=image,
        ),
        SimpleNamespace(
            number="003",
            title="Third",
            subtitle="",
            author_id=1,
            content="Third article content.",
            image=None,
        ),
        SimpleNamespace(
            number="004",
            title="Fourth",
            subtitle="",
            author_id=1,
            content="Fourth article content.",
            image=None,
        ),
    ]
    template = _publication_template().model_copy(
        update={
            "allow_images": True,
            "article_page_mode": "flow",
            "image_width": 72,
            "show_footer": False,
            "show_header": False,
            "title_size": 25,
            "title_spacing": 24,
            "title_surface_enabled": True,
        }
    )

    page_count = PdfRenderer().render(
        PdfDocumentData(
            book=SimpleNamespace(
                title="Column fill test",
                description="",
                owner_name="Editor",
            ),
            articles=articles,
            author_names={1: "Student"},
            sections=[{"kind": "articles"}],
            template=template,
        ),
        tmp_path / "column-fill.pdf",
    )

    assert page_count == 1


def test_long_bilingual_quote_matches_preview_across_columns(tmp_path: Path) -> None:
    destination = tmp_path / "long-bilingual-quote.pdf"
    quote = "引用内容 Quote content " * 180
    article = SimpleNamespace(
        number="",
        title="Quote export",
        subtitle="引用导出",
        author_id=1,
        content=f"> {quote}\nNormal paragraph after quote / 引用后的普通正文。",
        image=None,
    )
    template = _publication_template().model_copy(
        update={
            "show_header": False,
            "show_footer": False,
            "show_author_meta": False,
        }
    )

    page_count = PdfRenderer().render(
        PdfDocumentData(
            book=SimpleNamespace(
                title="Quote test",
                description="",
                owner_name="Editor",
            ),
            articles=[article],
            author_names={1: "Student"},
            sections=[{"kind": "articles"}],
            template=template,
        ),
        destination,
        include_page_numbers=False,
        include_page_chrome=False,
    )

    reader = PdfReader(destination)
    assert page_count == len(reader.pages)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert "引用内容" in text
    assert "Normal paragraph after quote" in text
    assert ">" not in text

    content = b"\n".join(page.get_contents().get_data() for page in reader.pages)
    assert b".862745 .14902 .14902 RG" in content
    assert b".862745 .14902 .14902 rg" not in content
    assert b" re" not in content


def test_flow_mode_places_multiple_articles_on_one_page(tmp_path: Path) -> None:
    template = _publication_template().model_copy(
        update={
            "columns": 1,
            "article_page_mode": "flow",
            "show_header": False,
            "show_footer": False,
            "show_author_meta": False,
            "title_size": 16,
            "font_size": 10,
        }
    )
    book = SimpleNamespace(
        title="Flow test",
        description="",
        owner_name="Editor",
    )
    articles = [
        SimpleNamespace(
            number=str(index),
            title=title,
            subtitle="",
            author_id=1,
            content=(
                "This short submitted story stays intact and should share the page."
            ),
            image=None,
        )
        for index, title in enumerate(("First story", "Second story"), start=1)
    ]
    destination = tmp_path / "flow.pdf"

    page_count = PdfRenderer().render(
        PdfDocumentData(
            book=book,
            articles=articles,
            author_names={1: "Student"},
            sections=[{"kind": "articles"}],
            template=template,
        ),
        destination,
    )

    reader = PdfReader(destination)
    assert page_count == len(reader.pages) == 1
    text = reader.pages[0].extract_text() or ""
    assert "First story" in text
    assert "Second story" in text


def test_title_surface_keeps_title_and_body_left_edges_aligned(
    tmp_path: Path,
) -> None:
    destination = tmp_path / "aligned-title-surface.pdf"
    template = _publication_template().model_copy(
        update={
            "columns": 1,
            "numbering_style": "hidden",
            "show_header": False,
            "show_footer": False,
            "show_author_meta": False,
            "title_surface_enabled": True,
            "title_surface_opacity": 35,
            "first_line_indent": 0,
        }
    )
    article = SimpleNamespace(
        number="",
        title="ALIGNED TITLE",
        subtitle="",
        author_id=1,
        content="ALIGNED BODY",
        image=None,
    )

    PdfRenderer().render(
        PdfDocumentData(
            book=SimpleNamespace(title="Alignment", description="", owner_name=""),
            articles=[article],
            author_names={1: ""},
            sections=[{"kind": "articles"}],
            template=template,
        ),
        destination,
        include_page_numbers=False,
        include_page_chrome=False,
    )

    reader = PdfReader(destination)
    page = reader.pages[0]
    positions, _ = _page_layout(
        page,
        ("ALIGNED TITLE", "ALIGNED BODY"),
    )
    assert positions.keys() >= {"ALIGNED TITLE", "ALIGNED BODY"}
    assert abs(positions["ALIGNED TITLE"][0] - positions["ALIGNED BODY"][0]) <= 1

    fill_color: tuple[float, float, float] | None = None
    fill_alpha = 1.0
    translucent_white_surface = False
    ext_gstates = page["/Resources"]["/ExtGState"]
    for operands, operator in ContentStream(page["/Contents"], reader).operations:
        if operator == b"rg":
            fill_color = tuple(float(value) for value in operands)
        elif operator == b"gs" and "/ca" in ext_gstates[operands[0]]:
            fill_alpha = float(ext_gstates[operands[0]]["/ca"])
        elif operator in {b"f", b"f*", b"B", b"B*"}:
            if fill_color == (1.0, 1.0, 1.0) and fill_alpha == pytest.approx(0.35):
                translucent_white_surface = True
                break
    assert translucent_white_surface


def test_magazine_chapter_page_uses_the_full_page_width(tmp_path: Path) -> None:
    destination = tmp_path / "acknowledgements.pdf"
    document = PdfDocumentData(
        book=SimpleNamespace(
            title="Two-column test",
            description="",
            owner_name="Editor",
        ),
        articles=[],
        author_names={},
        sections=[{"kind": "page", "preset": "acknowledgement"}],
        template=_publication_template(),
    )

    page_count = PdfRenderer().render(document, destination)

    reader = PdfReader(destination)
    assert page_count == len(reader.pages) == 1
    assert "Acknowledgements" in (reader.pages[0].extract_text() or "")


def test_bilingual_image_story_keeps_a_compact_opener_in_one_column(
    bilingual_flow_document: PdfDocumentData,
    tmp_path: Path,
) -> None:
    destination = tmp_path / "bilingual-flow.pdf"

    page_count = PdfRenderer().render(bilingual_flow_document, destination)

    reader = PdfReader(destination)
    assert page_count == len(reader.pages) == 1
    page = reader.pages[0]
    text = page.extract_text() or ""
    assert "IMG TITLE" in text
    assert "图文" in text
    assert "BODY LEAD" in text
    assert "中英正文" in text

    markers = (
        "IMG TITLE",
        "IMG LEAD",
        "003",
        "TIGHT",
        "SUBTITLE",
        "AUTHOR",
        "BODY LEAD",
    )
    positions, image_matrices = _page_layout(page, markers)
    assert positions.keys() >= set(markers)
    assert len(image_matrices) == 1

    image_x = image_matrices[0][4]
    opener_x = [
        positions["IMG TITLE"][0],
        image_x,
        positions["IMG LEAD"][0],
    ]
    assert max(opener_x) - min(opener_x) <= 6

    number_y = positions["003"][1]
    title_y = positions["TIGHT"][1]
    subtitle_y = positions["SUBTITLE"][1]
    author_y = positions["AUTHOR"][1]
    body_y = positions["BODY LEAD"][1]
    assert 0 < number_y - title_y <= 32
    assert 0 < title_y - subtitle_y <= 36
    assert 0 < author_y - body_y <= 30
