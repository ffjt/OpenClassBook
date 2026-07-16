import math
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from app.models.article import Article
from app.repositories.export import ExportBundle, ExportRepository
from app.schemas.export import (
    ExportBookInfo,
    ExportPreviewPage,
    ExportPreviewResponse,
    ExportResponse,
    ExportSection,
    ExportStats,
    ExportTemplateInfo,
)
from app.services.page_asset_renderer import (
    PageAssetError,
    PageAssetRenderer,
    assemble_fragments,
)
from app.services.pdf_renderer import PdfDocumentData, PdfRenderer
from app.storage.local import LocalBookStorage

DEFAULT_SECTIONS = [
    {"id": "cover", "kind": "page", "preset": "cover", "name": None, "file": None},
    {"id": "preface", "kind": "page", "preset": "preface", "name": None, "file": None},
    {
        "id": "articles",
        "kind": "articles",
        "preset": "articles",
        "name": None,
        "file": None,
    },
    {
        "id": "afterword",
        "kind": "page",
        "preset": "afterword",
        "name": None,
        "file": None,
    },
    {
        "id": "acknowledgement",
        "kind": "page",
        "preset": "acknowledgement",
        "name": None,
        "file": None,
    },
    {
        "id": "back_cover",
        "kind": "page",
        "preset": "back_cover",
        "name": None,
        "file": None,
    },
]

SECTION_LABELS = {
    "cover": ("Cover", "封面"),
    "preface": ("Preface", "前言"),
    "articles": ("Main content", "正文"),
    "principal_message": ("Principal's message", "校长寄语"),
    "teacher_message": ("Teacher's message", "教师寄语"),
    "afterword": ("Afterword", "后记"),
    "closing": ("Closing remarks", "结语"),
    "acknowledgement": ("Acknowledgements", "致谢"),
    "back_cover": ("Back cover", "封底"),
}


class NoPublishableContentError(Exception):
    pass


class SourceFileError(Exception):
    def __init__(self, label_en: str, label_zh: str) -> None:
        self.label_en = label_en
        self.label_zh = label_zh
        super().__init__(label_en)


@dataclass(frozen=True)
class AssetPreflight:
    page_counts: dict[str, int]
    image_count: int
    valid_count: int
    warnings: tuple[str, ...]
    warnings_zh: tuple[str, ...]
    errors: tuple[str, ...]
    errors_zh: tuple[str, ...]


class ExportService:
    def __init__(
        self,
        repository: ExportRepository,
        renderer: PdfRenderer,
        asset_renderer: PageAssetRenderer,
        storage: LocalBookStorage,
        export_dir: Path,
    ) -> None:
        self.repository = repository
        self.renderer = renderer
        self.asset_renderer = asset_renderer
        self.storage = storage
        self.export_dir = export_dir

    def get_preview(self, book_id: int) -> ExportPreviewResponse | None:
        bundle = self.repository.get_bundle(book_id)
        if bundle is None:
            return None
        _sort_articles(bundle)
        template = _resolve_template(bundle)
        sections = _resolve_sections(bundle)
        preflight = self._preflight_assets(sections, template)
        preview_pages = _preview_pages(
            bundle,
            sections,
            template,
            preflight.page_counts,
        )
        timestamps = [bundle.book.created_at, bundle.book.updated_at]
        timestamps.extend(author.updated_at for author in bundle.authors)
        timestamps.extend(article.updated_at for article in bundle.articles)
        missing_cover = any(
            section.get("preset") == "cover" and not section.get("file")
            for section in sections
        )
        warnings = list(preflight.warnings)
        warnings_zh = list(preflight.warnings_zh)
        if missing_cover:
            warnings.insert(0, "No cover is set. The default cover will be used.")
            warnings_zh.insert(0, "未设置封面。将使用默认封面。")
        warnings.extend(preflight.errors)
        warnings_zh.extend(preflight.errors_zh)
        has_content = bool(bundle.articles) or preflight.valid_count > 0
        return ExportPreviewResponse(
            book=ExportBookInfo.model_validate(bundle.book, from_attributes=True),
            template=template,
            stats=ExportStats(
                article_count=len(bundle.articles),
                estimated_page_count=len(preview_pages),
                image_count=(
                    sum(bool(article.image) for article in bundle.articles)
                    + preflight.image_count
                ),
                last_updated=max(timestamps),
            ),
            sections=[
                _export_section(section, bool(bundle.articles)) for section in sections
            ],
            preview_pages=preview_pages,
            warnings=warnings,
            warnings_zh=warnings_zh,
            can_export=has_content and not preflight.errors,
        )

    def generate(self, book_id: int, download_prefix: str) -> ExportResponse | None:
        bundle = self.repository.get_bundle(book_id)
        if bundle is None:
            return None
        _sort_articles(bundle)
        sections = _resolve_sections(bundle)
        has_uploaded_asset = any(section.get("file") for section in sections)
        if not bundle.articles and not has_uploaded_asset:
            raise NoPublishableContentError

        template = _resolve_template(bundle)
        task_id = uuid4().hex
        destination = self.export_dir / f"book-{book_id}-{task_id}.pdf"
        self.export_dir.mkdir(parents=True, exist_ok=True)
        try:
            with TemporaryDirectory(
                prefix=f"book-{book_id}-",
                dir=self.export_dir,
            ) as temporary:
                fragments = self._render_fragments(
                    bundle,
                    sections,
                    template,
                    Path(temporary),
                )
                page_count = assemble_fragments(
                    fragments,
                    destination,
                    template,
                    title=bundle.book.title,
                    author=bundle.book.owner_name,
                )
        except Exception:
            destination.unlink(missing_ok=True)
            raise
        return ExportResponse(
            task_id=task_id,
            download_url=f"{download_prefix}/{task_id}/download",
            page_count=page_count,
            generated_at=datetime.now(UTC),
        )

    def get_artifact(self, book_id: int, task_id: str) -> Path | None:
        if not re.fullmatch(r"[a-f0-9]{32}", task_id):
            return None
        path = self.export_dir / f"book-{book_id}-{task_id}.pdf"
        return path if path.is_file() else None

    def _preflight_assets(
        self,
        sections: list[dict[str, object]],
        template: ExportTemplateInfo,
    ) -> AssetPreflight:
        page_counts: dict[str, int] = {}
        warnings: list[str] = []
        warnings_zh: list[str] = []
        errors: list[str] = []
        errors_zh: list[str] = []
        image_count = 0
        valid_count = 0
        self.export_dir.mkdir(parents=True, exist_ok=True)
        with TemporaryDirectory(prefix="preview-", dir=self.export_dir) as temporary:
            directory = Path(temporary)
            for index, section in enumerate(sections):
                relative_path = section.get("file")
                if not relative_path:
                    continue
                label_en, label_zh = _section_labels(section)
                source = self.storage.resolve(str(relative_path))
                if source is None:
                    errors.append(
                        f"{label_en} file is missing. Replace it before export."
                    )
                    errors_zh.append(f"{label_zh}文件不存在，请替换后再导出。")
                    continue
                try:
                    rendered = self.asset_renderer.render(
                        source,
                        template,
                        directory / f"asset-{index}.pdf",
                        prefer_native_docx=False,
                    )
                except PageAssetError:
                    errors.append(
                        f"{label_en} file cannot be parsed. Replace it before export."
                    )
                    errors_zh.append(f"{label_zh}文件无法解析，请替换后再导出。")
                    continue
                page_counts[str(section["id"])] = rendered.page_count
                valid_count += 1
                image_count += rendered.image_count
                warnings.extend(
                    f"{label_en}: {warning}" for warning in rendered.warnings
                )
                warnings_zh.extend(
                    f"{label_zh}：{warning}" for warning in rendered.warnings_zh
                )
        return AssetPreflight(
            page_counts=page_counts,
            image_count=image_count,
            valid_count=valid_count,
            warnings=tuple(warnings),
            warnings_zh=tuple(warnings_zh),
            errors=tuple(errors),
            errors_zh=tuple(errors_zh),
        )

    def _render_fragments(
        self,
        bundle: ExportBundle,
        sections: list[dict[str, object]],
        template: ExportTemplateInfo,
        directory: Path,
    ) -> list[Path]:
        fragments: list[Path] = []
        for index, section in enumerate(sections):
            if section["kind"] == "articles" and not bundle.articles:
                continue
            destination = directory / f"section-{index}.pdf"
            relative_path = section.get("file")
            if section["kind"] != "articles" and relative_path:
                label_en, label_zh = _section_labels(section)
                source = self.storage.resolve(str(relative_path))
                if source is None:
                    raise SourceFileError(label_en, label_zh)
                try:
                    self.asset_renderer.render(source, template, destination)
                except PageAssetError as error:
                    raise SourceFileError(label_en, label_zh) from error
            else:
                self.renderer.render(
                    PdfDocumentData(
                        book=bundle.book,
                        articles=bundle.articles,
                        author_names={
                            author.id: author.name for author in bundle.authors
                        },
                        sections=[section],
                        template=template,
                    ),
                    destination,
                    include_page_numbers=False,
                )
            fragments.append(destination)
        return fragments


def _resolve_template(bundle: ExportBundle) -> ExportTemplateInfo:
    stored = bundle.template
    title = stored.title_format or {} if stored else {}
    body = stored.body_format or {} if stored else {}
    images = stored.image_rules or {} if stored else {}
    numbering = stored.numbering_rules or {} if stored else {}
    page = stored.page_rules or {} if stored else {}
    body_font = body.get("font", "serif")
    if isinstance(body_font, dict):
        body_font = body_font.get("fullName") or body_font.get("family") or "serif"
    return ExportTemplateInfo(
        font=str(body_font),
        font_size=_number(body.get("size"), 14),
        page_size=str(page.get("size", "a4")),
        page_margin=str(page.get("margin", "normal")),
        allow_images=bool(images.get("allow", True)),
        image_align=str(images.get("align", "center")),
        image_width=_number(images.get("max_width"), 72),
        numbering_style=(
            str(numbering.get("position", "above"))
            if bundle.book.number_mode != "none" and numbering.get("show", True)
            else "hidden"
        ),
        line_height=_number(body.get("line_height"), 1.5),
        title_size=_number(title.get("size"), 24),
        title_align=str(title.get("align", "center")),
        title_bold=bool(title.get("bold", True)),
        subtitle_mode=str(title.get("subtitle_mode", "free")),
        fixed_subtitle=str(title.get("fixed_subtitle", "")),
        subtitle_align=str(title.get("subtitle_align", "center")),
        body_justify=bool(body.get("justify", True)),
        first_line_indent=_number(body.get("first_line_indent"), 2),
        page_number_position=str(page.get("number_position", "center")),
        custom_page_width=_number(page.get("custom_width"), 210),
        custom_page_height=_number(page.get("custom_height"), 297),
    )


def _resolve_sections(bundle: ExportBundle) -> list[dict[str, object]]:
    if bundle.book.layout_sections:
        return [dict(section) for section in bundle.book.layout_sections]
    sections = [dict(section) for section in DEFAULT_SECTIONS]
    files = {
        "cover": bundle.book.cover_file,
        "preface": bundle.book.preface_file,
        "afterword": bundle.book.afterword_file,
        "acknowledgement": bundle.book.acknowledgement_file,
        "back_cover": bundle.book.back_cover_file,
    }
    for section in sections:
        preset = section.get("preset")
        if preset in files:
            section["file"] = files[preset]
    return sections


def _export_section(section: dict[str, object], has_articles: bool) -> ExportSection:
    label_en, label_zh = _section_labels(section)
    preset = section.get("preset")
    has_source = (
        has_articles if section["kind"] == "articles" else bool(section.get("file"))
    )
    if preset in {"cover", "back_cover"}:
        has_source = True
    return ExportSection(
        id=str(section["id"]),
        kind=str(section["kind"]),
        preset=str(preset) if preset else None,
        label_en=label_en,
        label_zh=label_zh,
        has_source=has_source,
    )


def _preview_pages(
    bundle: ExportBundle,
    sections: list[dict[str, object]],
    template: ExportTemplateInfo,
    asset_page_counts: dict[str, int],
) -> list[ExportPreviewPage]:
    pages: list[ExportPreviewPage] = []
    for section in sections:
        if section["kind"] == "articles":
            for article in bundle.articles:
                count = _estimate_article_pages(
                    article.content,
                    bool(article.image) and template.allow_images,
                    template,
                )
                for index in range(count):
                    suffix_en = "" if index == 0 else " · continued"
                    suffix_zh = "" if index == 0 else " · 续"
                    pages.append(
                        ExportPreviewPage(
                            page_number=len(pages) + 1,
                            kind="article",
                            label_en=f"{article.title}{suffix_en}",
                            label_zh=f"{article.title}{suffix_zh}",
                        )
                    )
            continue
        label_en, label_zh = _section_labels(section)
        page_count = asset_page_counts.get(str(section["id"]), 1)
        is_asset = str(section["id"]) in asset_page_counts
        for index in range(page_count):
            suffix = f" · {index + 1}/{page_count}" if page_count > 1 else ""
            pages.append(
                ExportPreviewPage(
                    page_number=len(pages) + 1,
                    kind="page",
                    label_en=f"{label_en}{suffix}",
                    label_zh=f"{label_zh}{suffix}",
                    is_placeholder=not is_asset,
                )
            )
    return pages


def _estimate_article_pages(
    content: str,
    has_image: bool,
    template: ExportTemplateInfo,
) -> int:
    page_area = {"a4": 1.0, "a5": 0.62, "b5": 0.76}.get(template.page_size, 1.0)
    margin_factor = {"narrow": 1.15, "normal": 1.0, "wide": 0.82}.get(
        template.page_margin, 1.0
    )
    capacity = 950 * page_area * margin_factor * (14 / template.font_size)
    capacity /= max(template.line_height / 1.5, 0.7)
    if has_image:
        capacity *= max(0.45, 1 - template.image_width / 180)
    return max(1, math.ceil(max(len(content.strip()), 1) / max(capacity, 250)))


def _number(value: object, fallback: float) -> float:
    return float(value) if isinstance(value, int | float) else fallback


def _sort_articles(bundle: ExportBundle) -> None:
    positions = {
        article_id: index
        for index, article_id in enumerate(bundle.book.layout_article_order or [])
    }
    bundle.articles.sort(key=lambda article: _article_sort_key(article, positions))


def _article_sort_key(
    article: Article,
    positions: dict[int, int],
) -> tuple[int, int, list[tuple[int, object]], int]:
    if article.id in positions:
        return (0, positions[article.id], [], article.id)
    number = article.number
    if not number:
        return (1, 0, [(2, "")], article.id)
    parts = re.split(r"(\d+)", number.casefold())
    natural = [(0, int(part)) if part.isdigit() else (1, part) for part in parts]
    return (1, 0, natural, article.id)


def _section_labels(section: dict[str, object]) -> tuple[str, str]:
    preset = str(section.get("preset") or "")
    name = str(section.get("name") or "")
    return SECTION_LABELS.get(preset, (name or "Page", name or "页面"))
