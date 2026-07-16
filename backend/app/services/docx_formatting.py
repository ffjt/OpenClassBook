import base64
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from zipfile import ZipFile

import mammoth
from mammoth import documents

_NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "v": "urn:schemas-microsoft-com:vml",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
}
_HIGHLIGHT_COLORS = {
    "black": "#000000",
    "blue": "#0000ff",
    "cyan": "#00ffff",
    "darkBlue": "#000080",
    "darkCyan": "#008080",
    "darkGray": "#808080",
    "darkGreen": "#008000",
    "darkMagenta": "#800080",
    "darkRed": "#800000",
    "darkYellow": "#808000",
    "green": "#00ff00",
    "lightGray": "#c0c0c0",
    "magenta": "#ff00ff",
    "red": "#ff0000",
    "white": "#ffffff",
    "yellow": "#ffff00",
}
_ALIGNMENTS = {
    "both": "justify",
    "center": "center",
    "distribute": "justify",
    "end": "right",
    "highKashida": "justify",
    "left": "left",
    "lowKashida": "justify",
    "mediumKashida": "justify",
    "right": "right",
    "start": "left",
    "thaiDistribute": "justify",
}
_BORDER_STYLES = {
    "dashed": "dashed",
    "dashDotStroked": "dashed",
    "dashSmallGap": "dashed",
    "dotted": "dotted",
    "dotDash": "dashed",
    "dotDotDash": "dashed",
    "double": "double",
    "nil": "none",
    "none": "none",
}
_THEME_ALIASES = {
    "background1": "lt1",
    "background2": "lt2",
    "dark1": "dk1",
    "dark2": "dk2",
    "followedHyperlink": "folHlink",
    "hyperlink": "hlink",
    "light1": "lt1",
    "light2": "lt2",
    "text1": "dk1",
    "text2": "dk2",
}
_EXCLUDED_ANCESTORS = {
    f"{{{_NS['mc']}}}Choice",
    f"{{{_NS['w']}}}del",
    f"{{{_NS['w']}}}moveFrom",
}


def _q(name: str) -> str:
    prefix, local_name = name.split(":", 1)
    return f"{{{_NS[prefix]}}}{local_name}"


@dataclass(frozen=True)
class DocxHtml:
    value: str
    css: str
    messages: tuple[object, ...]


@dataclass(frozen=True)
class _Style:
    based_on: str | None
    name: str
    paragraph: dict[str, object]
    run: dict[str, object]


@dataclass(frozen=True)
class _RunFormat:
    css_class: str | None
    font_kind: str
    bold: bool | None
    italic: bool | None
    underline: bool | None
    strike: bool | None
    all_caps: bool | None
    small_caps: bool | None
    vertical_alignment: str | None


@dataclass(frozen=True)
class _ParagraphFormat:
    style_id: str | None


@dataclass(frozen=True)
class _FormattingPlan:
    runs: tuple[_RunFormat, ...]
    paragraphs: tuple[_ParagraphFormat, ...]
    images: tuple[str | None, ...]
    tables: tuple[str | None, ...]
    cells: tuple[str | None, ...]
    style_map: str
    css: str


def convert_docx_to_html(source: Path) -> DocxHtml:
    plan = _read_formatting_plan(source)
    run_index = 0
    paragraph_index = 0
    image_index = 0

    def transform_run(run):
        nonlocal run_index
        item = plan.runs[run_index] if run_index < len(plan.runs) else None
        run_index += 1
        if item is None:
            return run
        changes = {
            "is_bold": item.bold if item.bold is not None else run.is_bold,
            "is_italic": item.italic if item.italic is not None else run.is_italic,
            "is_underline": (
                item.underline if item.underline is not None else run.is_underline
            ),
            "is_strikethrough": (
                item.strike if item.strike is not None else run.is_strikethrough
            ),
            "is_all_caps": (
                item.all_caps if item.all_caps is not None else run.is_all_caps
            ),
            "is_small_caps": (
                item.small_caps if item.small_caps is not None else run.is_small_caps
            ),
            "vertical_alignment": item.vertical_alignment or run.vertical_alignment,
        }
        if item.css_class:
            changes["style_id"] = item.css_class.replace("docx-run-", "OCBR")
        changes["children"] = _font_children(run.children, item.font_kind)
        return run.copy(**changes)

    def transform_paragraph(paragraph):
        nonlocal paragraph_index
        item = (
            plan.paragraphs[paragraph_index]
            if paragraph_index < len(plan.paragraphs)
            else None
        )
        paragraph_index += 1
        if item is None or item.style_id is None:
            return paragraph
        return paragraph.copy(style_id=item.style_id)

    def transform_document(document):
        transformed = mammoth.transforms.run(transform_run)(document)
        return mammoth.transforms.paragraph(transform_paragraph)(transformed)

    @mammoth.images.img_element
    def convert_image(image):
        nonlocal image_index
        css_class = plan.images[image_index] if image_index < len(plan.images) else None
        image_index += 1
        with image.open() as image_bytes:
            encoded = base64.b64encode(image_bytes.read()).decode("ascii")
        attributes = {
            "src": f"data:{image.content_type};base64,{encoded}",
        }
        if css_class:
            attributes["class"] = css_class
        return attributes

    with source.open("rb") as document:
        result = mammoth.convert_to_html(
            document,
            convert_image=convert_image,
            include_embedded_style_map=False,
            style_map=plan.style_map,
            transform_document=transform_document,
        )
    value = _inject_classes(result.value, "table", plan.tables)
    value = _inject_classes(value, "(?:td|th)", plan.cells)
    return DocxHtml(value=value, css=plan.css, messages=tuple(result.messages))


def _read_formatting_plan(source: Path) -> _FormattingPlan:
    with ZipFile(source) as archive:
        document = ET.fromstring(archive.read("word/document.xml"))
        styles_root = _read_xml(archive, "word/styles.xml")
        theme_root = _read_xml(archive, "word/theme/theme1.xml")

    theme_colors, theme_fonts = _read_theme(theme_root)
    styles, default_style_ids, default_paragraph, default_run = _read_styles(
        styles_root,
        theme_colors,
        theme_fonts,
    )
    parents = {child: parent for parent in document.iter() for child in parent}

    rules: list[str] = []
    style_map = [
        "u => u",
        "br[type='page'] => br.docx-page-break",
        "r.OCBFCjk => span.docx-font-cjk",
        "r.OCBFMono => span.docx-font-mono",
        "r.OCBFSans => span.docx-font-sans",
        "r.OCBFSerif => span.docx-font-serif",
    ]
    rules.extend(
        (
            ".docx-font-cjk { font-family: STSong-Light; }",
            ".docx-font-mono { font-family: Courier; }",
            ".docx-font-sans { font-family: Helvetica; }",
            ".docx-font-serif { font-family: Times-Roman; }",
        )
    )
    run_classes: dict[tuple[tuple[str, str], ...], str] = {}
    paragraph_classes: dict[tuple[tuple[str, str], ...], str] = {}
    image_classes: dict[tuple[tuple[str, str], ...], str] = {}
    table_classes: dict[tuple[tuple[str, str], ...], str] = {}
    cell_classes: dict[tuple[tuple[str, str], ...], str] = {}

    paragraphs: list[_ParagraphFormat] = []
    paragraph_run_properties: dict[ET.Element, dict[str, object]] = {}
    for paragraph in document.iter(_q("w:p")):
        if _is_excluded(paragraph, parents):
            continue
        properties = paragraph.find(_q("w:pPr"))
        style_id = (
            _attr(properties.find(_q("w:pStyle")), "w:val")
            if properties is not None
            else None
        )
        style_id = style_id or default_style_ids.get("paragraph")
        inherited_paragraph = _style_properties(styles, style_id, "paragraph")
        inherited_run = _style_properties(styles, style_id, "run")
        paragraph_run_properties[paragraph] = {**default_run, **inherited_run}
        effective = {
            **default_paragraph,
            **inherited_paragraph,
            **_paragraph_properties(properties, theme_colors),
        }
        css = _paragraph_css(effective)
        css_class = _class_for(css, "docx-paragraph", paragraph_classes)
        if css_class:
            selector = f".{css_class}"
            rules.append(_css_rule(selector, css))
            alignment = dict(css).get("text-align")
            if alignment in {"left", "right", "center"}:
                left = "0" if alignment == "left" else "auto"
                right = "0" if alignment == "right" else "auto"
                rules.append(
                    f"{selector} img {{ margin-left: {left}; margin-right: {right}; }}"
                )
            synthetic_id = css_class.replace("docx-paragraph-", "OCBP")
            _add_paragraph_style_map(
                style_map,
                synthetic_id,
                css_class,
                _heading_level(styles, style_id),
            )
        else:
            synthetic_id = None
        paragraphs.append(_ParagraphFormat(style_id=synthetic_id))

    runs: list[_RunFormat] = []
    for run in document.iter(_q("w:r")):
        if _is_excluded(run, parents):
            continue
        paragraph = _ancestor(run, parents, _q("w:p"))
        inherited = paragraph_run_properties.get(paragraph, default_run)
        properties = run.find(_q("w:rPr"))
        character_style_id = (
            _attr(properties.find(_q("w:rStyle")), "w:val")
            if properties is not None
            else None
        )
        effective = {
            **inherited,
            **_style_properties(styles, character_style_id, "run"),
            **_run_properties(properties, theme_colors, theme_fonts),
        }
        css = _run_css(effective)
        css_class = _class_for(css, "docx-run", run_classes)
        if css_class:
            rules.append(_css_rule(f".{css_class}", css))
            style_map.append(
                f"r.{css_class.replace('docx-run-', 'OCBR')} => span.{css_class}"
            )
        runs.append(
            _RunFormat(
                css_class=css_class,
                font_kind=_font_kind(effective.get("font")),
                bold=_as_bool(effective.get("bold")),
                italic=_as_bool(effective.get("italic")),
                underline=_as_bool(effective.get("underline")),
                strike=_as_bool(effective.get("strike")),
                all_caps=_as_bool(effective.get("all_caps")),
                small_caps=_as_bool(effective.get("small_caps")),
                vertical_alignment=_vertical_alignment(effective.get("vert_align")),
            )
        )

    images: list[str | None] = []
    image_nodes = {_q("a:blip"), _q("v:imagedata")}
    for node in document.iter():
        if node.tag not in image_nodes or _is_excluded(node, parents):
            continue
        drawing = _ancestor(node, parents, _q("wp:inline"))
        if drawing is None:
            drawing = _ancestor(node, parents, _q("wp:anchor"))
        extent = drawing.find(_q("wp:extent")) if drawing is not None else None
        css = _image_css(extent)
        css_class = _class_for(css, "docx-image", image_classes)
        if css_class:
            rules.append(_css_rule(f".{css_class}", css))
        images.append(css_class)

    tables: list[str | None] = []
    for table in document.iter(_q("w:tbl")):
        if _is_excluded(table, parents):
            continue
        css = _table_css(table.find(_q("w:tblPr")), theme_colors)
        css_class = _class_for(css, "docx-table", table_classes)
        if css_class:
            rules.append(_css_rule(f".{css_class}", css))
        tables.append(css_class)

    cells: list[str | None] = []
    for cell in document.iter(_q("w:tc")):
        if _is_excluded(cell, parents) or _is_vertical_merge_continuation(cell):
            continue
        css = _cell_css(cell.find(_q("w:tcPr")), theme_colors)
        css_class = _class_for(css, "docx-cell", cell_classes)
        if css_class:
            rules.append(_css_rule(f".{css_class}", css))
        cells.append(css_class)

    rules.append(".docx-page-break { display: block; page-break-after: always; }")
    return _FormattingPlan(
        runs=tuple(runs),
        paragraphs=tuple(paragraphs),
        images=tuple(images),
        tables=tuple(tables),
        cells=tuple(cells),
        style_map="\n".join(dict.fromkeys(style_map)),
        css="\n".join(dict.fromkeys(rules)),
    )


def _read_xml(archive: ZipFile, name: str) -> ET.Element | None:
    try:
        return ET.fromstring(archive.read(name))
    except KeyError:
        return None


def _read_theme(root: ET.Element | None) -> tuple[dict[str, str], dict[str, str]]:
    if root is None:
        return {}, {}
    colors: dict[str, str] = {}
    scheme = root.find(".//a:clrScheme", _NS)
    if scheme is not None:
        for item in scheme:
            if not len(item):
                continue
            color = item[0].get("val") or item[0].get("lastClr")
            if color and re.fullmatch(r"[0-9A-Fa-f]{6}", color):
                colors[item.tag.rsplit("}", 1)[-1]] = f"#{color.lower()}"
    fonts: dict[str, str] = {}
    for group_name, prefix in (("majorFont", "major"), ("minorFont", "minor")):
        group = root.find(f".//a:{group_name}", _NS)
        if group is None:
            continue
        for tag, suffix in (("latin", "HAnsi"), ("ea", "EastAsia"), ("cs", "Bidi")):
            element = group.find(f"a:{tag}", _NS)
            typeface = element.get("typeface") if element is not None else None
            if typeface:
                fonts[f"{prefix}{suffix}"] = typeface
                if suffix == "HAnsi":
                    fonts[f"{prefix}Ascii"] = typeface
    return colors, fonts


def _read_styles(
    root: ET.Element | None,
    theme_colors: dict[str, str],
    theme_fonts: dict[str, str],
) -> tuple[dict[str, _Style], dict[str, str], dict[str, object], dict[str, object]]:
    if root is None:
        return {}, {}, {}, {}
    styles: dict[str, _Style] = {}
    defaults: dict[str, str] = {}
    for element in root.findall("w:style", _NS):
        style_id = _attr(element, "w:styleId")
        style_type = _attr(element, "w:type")
        if not style_id or not style_type:
            continue
        if _attr(element, "w:default") in {"1", "true", "on"}:
            defaults[style_type] = style_id
        styles[style_id] = _Style(
            based_on=_attr(element.find("w:basedOn", _NS), "w:val"),
            name=_attr(element.find("w:name", _NS), "w:val") or style_id,
            paragraph=_paragraph_properties(
                element.find("w:pPr", _NS), theme_colors
            ),
            run=_run_properties(element.find("w:rPr", _NS), theme_colors, theme_fonts),
        )
    defaults_root = root.find("w:docDefaults", _NS)
    default_paragraph = _paragraph_properties(
        defaults_root.find("w:pPrDefault/w:pPr", _NS)
        if defaults_root is not None
        else None,
        theme_colors,
    )
    default_run = _run_properties(
        defaults_root.find("w:rPrDefault/w:rPr", _NS)
        if defaults_root is not None
        else None,
        theme_colors,
        theme_fonts,
    )
    return styles, defaults, default_paragraph, default_run


def _style_properties(
    styles: dict[str, _Style], style_id: str | None, kind: str
) -> dict[str, object]:
    chain: list[_Style] = []
    visited: set[str] = set()
    while style_id and style_id not in visited and style_id in styles:
        visited.add(style_id)
        style = styles[style_id]
        chain.append(style)
        style_id = style.based_on
    properties: dict[str, object] = {}
    for style in reversed(chain):
        properties.update(getattr(style, kind))
    return properties


def _run_properties(
    element: ET.Element | None,
    theme_colors: dict[str, str],
    theme_fonts: dict[str, str],
) -> dict[str, object]:
    if element is None:
        return {}
    properties: dict[str, object] = {}
    for key, tag in (
        ("bold", "w:b"),
        ("italic", "w:i"),
        ("strike", "w:strike"),
        ("all_caps", "w:caps"),
        ("small_caps", "w:smallCaps"),
        ("hidden", "w:vanish"),
    ):
        child = element.find(_q(tag))
        if child is not None:
            properties[key] = _on_off(child)
    underline = element.find(_q("w:u"))
    if underline is not None:
        properties["underline"] = (_attr(underline, "w:val") or "single") not in {
            "0",
            "false",
            "none",
            "off",
        }
    color = _word_color(element.find(_q("w:color")), theme_colors)
    if color:
        properties["color"] = color
    highlight = element.find(_q("w:highlight"))
    highlight_value = _attr(highlight, "w:val")
    if highlight_value and highlight_value != "none":
        properties["background"] = _HIGHLIGHT_COLORS.get(highlight_value)
    shading = _word_fill(element.find(_q("w:shd")), theme_colors)
    if shading:
        properties["background"] = shading
    size = _half_points(_attr(element.find(_q("w:sz")), "w:val"))
    if size is not None:
        properties["font_size"] = size
    spacing = _twips(_attr(element.find(_q("w:spacing")), "w:val"))
    if spacing is not None:
        properties["letter_spacing"] = spacing
    fonts = element.find(_q("w:rFonts"))
    if fonts is not None:
        font = next(
            (
                _attr(fonts, name)
                for name in ("w:eastAsia", "w:hAnsi", "w:ascii", "w:cs")
                if _attr(fonts, name)
            ),
            None,
        )
        if font is None:
            font = next(
                (
                    theme_fonts.get(_attr(fonts, name) or "")
                    for name in (
                        "w:eastAsiaTheme",
                        "w:hAnsiTheme",
                        "w:asciiTheme",
                        "w:cstheme",
                    )
                    if theme_fonts.get(_attr(fonts, name) or "")
                ),
                None,
            )
        if font:
            properties["font"] = font
    vert_align = _attr(element.find(_q("w:vertAlign")), "w:val")
    if vert_align:
        properties["vert_align"] = vert_align
    return properties


def _paragraph_properties(
    element: ET.Element | None, theme_colors: dict[str, str]
) -> dict[str, object]:
    if element is None:
        return {}
    properties: dict[str, object] = {}
    alignment = _attr(element.find(_q("w:jc")), "w:val")
    if alignment:
        properties["alignment"] = alignment
    indent = element.find(_q("w:ind"))
    if indent is not None:
        for key, names in {
            "indent_left": ("w:start", "w:left"),
            "indent_right": ("w:end", "w:right"),
            "first_line": ("w:firstLine",),
            "hanging": ("w:hanging",),
        }.items():
            value = next(
                (_attr(indent, name) for name in names if _attr(indent, name)),
                None,
            )
            converted = _twips(value)
            if converted is not None:
                properties[key] = converted
    spacing = element.find(_q("w:spacing"))
    if spacing is not None:
        before = _twips(_attr(spacing, "w:before"))
        after = _twips(_attr(spacing, "w:after"))
        if before is not None:
            properties["space_before"] = before
        if after is not None:
            properties["space_after"] = after
        line = _number(_attr(spacing, "w:line"))
        if line is not None:
            rule = _attr(spacing, "w:lineRule") or "auto"
            properties["line_height"] = line / 240 if rule == "auto" else line / 20
            properties["line_height_unit"] = "ratio" if rule == "auto" else "pt"
    for key, tag in (
        ("page_break_before", "w:pageBreakBefore"),
        ("keep_with_next", "w:keepNext"),
    ):
        child = element.find(_q(tag))
        if child is not None:
            properties[key] = _on_off(child)
    background = _word_fill(element.find(_q("w:shd")), theme_colors)
    if background:
        properties["background"] = background
    return properties


def _run_css(properties: dict[str, object]) -> tuple[tuple[str, str], ...]:
    css: list[tuple[str, str]] = []
    for key, css_name in (
        ("color", "color"),
        ("background", "background-color"),
    ):
        value = properties.get(key)
        if isinstance(value, str) and value:
            css.append((css_name, value))
    size = _clamp(properties.get("font_size"), 4, 96)
    if size is not None:
        css.append(("font-size", f"{size:g}pt"))
    spacing = _clamp(properties.get("letter_spacing"), -5, 20)
    if spacing is not None:
        css.append(("letter-spacing", f"{spacing:g}pt"))
    if properties.get("all_caps") is True:
        css.append(("text-transform", "uppercase"))
    if properties.get("small_caps") is True:
        css.append(("font-variant", "small-caps"))
    if properties.get("hidden") is True:
        css.append(("display", "none"))
    return tuple(css)


def _paragraph_css(properties: dict[str, object]) -> tuple[tuple[str, str], ...]:
    css: list[tuple[str, str]] = []
    alignment = _ALIGNMENTS.get(str(properties.get("alignment")))
    if alignment:
        css.append(("text-align", alignment))
    for key, css_name in (
        ("indent_left", "margin-left"),
        ("indent_right", "margin-right"),
        ("space_before", "margin-top"),
        ("space_after", "margin-bottom"),
    ):
        value = _clamp(properties.get(key), -144, 720)
        if value is not None:
            css.append((css_name, f"{value:g}pt"))
    first_line = _clamp(properties.get("first_line"), -144, 720)
    hanging = _clamp(properties.get("hanging"), 0, 720)
    if first_line is not None or hanging is not None:
        css.append(("text-indent", f"{(first_line or 0) - (hanging or 0):g}pt"))
    line_height = _clamp(properties.get("line_height"), 0.5, 10)
    if line_height is not None:
        suffix = "" if properties.get("line_height_unit") == "ratio" else "pt"
        css.append(("line-height", f"{line_height:g}{suffix}"))
    background = properties.get("background")
    if isinstance(background, str) and background:
        css.append(("background-color", background))
    if properties.get("page_break_before") is True:
        css.append(("page-break-before", "always"))
    if properties.get("keep_with_next") is True:
        css.append(("page-break-after", "avoid"))
    return tuple(css)


def _image_css(element: ET.Element | None) -> tuple[tuple[str, str], ...]:
    if element is None:
        return ()
    width = _emu_points(element.get("cx"))
    height = _emu_points(element.get("cy"))
    css: list[tuple[str, str]] = []
    if width is not None:
        css.append(("width", f"{width:g}pt"))
    if height is not None:
        css.append(("height", f"{height:g}pt"))
    return tuple(css)


def _table_css(
    element: ET.Element | None, theme_colors: dict[str, str]
) -> tuple[tuple[str, str], ...]:
    if element is None:
        return ()
    css: list[tuple[str, str]] = []
    width = _width_css(element.find(_q("w:tblW")))
    if width:
        css.append(("width", width))
    alignment = _attr(element.find(_q("w:jc")), "w:val")
    if alignment in {"left", "start"}:
        css.extend((('margin-left', '0'), ('margin-right', 'auto')))
    elif alignment == "center":
        css.extend((('margin-left', 'auto'), ('margin-right', 'auto')))
    elif alignment in {"right", "end"}:
        css.extend((('margin-left', 'auto'), ('margin-right', '0')))
    _append_borders(css, element.find(_q("w:tblBorders")), theme_colors)
    return tuple(css)


def _cell_css(
    element: ET.Element | None, theme_colors: dict[str, str]
) -> tuple[tuple[str, str], ...]:
    if element is None:
        return ()
    css: list[tuple[str, str]] = []
    width = _width_css(element.find(_q("w:tcW")))
    if width:
        css.append(("width", width))
    fill = _word_fill(element.find(_q("w:shd")), theme_colors)
    if fill:
        css.append(("background-color", fill))
    vertical = _attr(element.find(_q("w:vAlign")), "w:val")
    if vertical in {"top", "center", "bottom"}:
        css.append(("vertical-align", "middle" if vertical == "center" else vertical))
    _append_borders(css, element.find(_q("w:tcBorders")), theme_colors)
    return tuple(css)


def _append_borders(
    css: list[tuple[str, str]],
    element: ET.Element | None,
    theme_colors: dict[str, str],
) -> None:
    if element is None:
        return
    for side in ("top", "right", "bottom", "left"):
        border = element.find(_q(f"w:{side}"))
        if border is None:
            continue
        value = _attr(border, "w:val") or "single"
        style = _BORDER_STYLES.get(value, "solid")
        if style == "none":
            css.append((f"border-{side}", "none"))
            continue
        size = _number(_attr(border, "w:sz"))
        width = max(0.25, min((size or 4) / 8, 12))
        color = _word_color(border, theme_colors) or "#000000"
        css.append((f"border-{side}", f"{width:g}pt {style} {color}"))


def _word_color(
    element: ET.Element | None, theme_colors: dict[str, str]
) -> str | None:
    if element is None:
        return None
    value = _attr(element, "w:val")
    if value and value != "auto" and re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        return f"#{value.lower()}"
    theme_name = _attr(element, "w:themeColor")
    color = theme_colors.get(_THEME_ALIASES.get(theme_name or "", theme_name or ""))
    return _adjust_color(
        color,
        _attr(element, "w:themeShade"),
        _attr(element, "w:themeTint"),
    )


def _word_fill(
    element: ET.Element | None, theme_colors: dict[str, str]
) -> str | None:
    if element is None:
        return None
    value = _attr(element, "w:fill")
    if value and value != "auto" and re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        return f"#{value.lower()}"
    theme_name = _attr(element, "w:themeFill")
    color = theme_colors.get(_THEME_ALIASES.get(theme_name or "", theme_name or ""))
    return _adjust_color(
        color,
        _attr(element, "w:themeFillShade"),
        _attr(element, "w:themeFillTint"),
    )


def _adjust_color(color: str | None, shade: str | None, tint: str | None) -> str | None:
    if not color:
        return None
    channels = [int(color[index : index + 2], 16) for index in (1, 3, 5)]
    if shade and re.fullmatch(r"[0-9A-Fa-f]{2}", shade):
        factor = int(shade, 16) / 255
        channels = [round(channel * factor) for channel in channels]
    if tint and re.fullmatch(r"[0-9A-Fa-f]{2}", tint):
        factor = int(tint, 16) / 255
        channels = [round(channel + (255 - channel) * factor) for channel in channels]
    return "#" + "".join(f"{channel:02x}" for channel in channels)


def _class_for(
    css: tuple[tuple[str, str], ...],
    prefix: str,
    classes: dict[tuple[tuple[str, str], ...], str],
) -> str | None:
    if not css:
        return None
    if css not in classes:
        classes[css] = f"{prefix}-{len(classes)}"
    return classes[css]


def _css_rule(selector: str, css: tuple[tuple[str, str], ...]) -> str:
    declarations = "; ".join(f"{name}: {value}" for name, value in css)
    return f"{selector} {{ {declarations}; }}"


def _add_paragraph_style_map(
    lines: list[str], style_id: str, css_class: str, heading_level: int | None
) -> None:
    for ordered in (False, True):
        list_name = "ordered-list" if ordered else "unordered-list"
        current = "ol" if ordered else "ul"
        for level in range(1, 6):
            ancestors = " > ".join(["ul|ol > li"] * (level - 1))
            path = f"{current} > li.{css_class}:fresh"
            if ancestors:
                path = f"{ancestors} > {path}"
            lines.append(f"p.{style_id}:{list_name}({level}) => {path}")
    tag = f"h{heading_level}" if heading_level else "p"
    lines.append(f"p.{style_id} => {tag}.{css_class}:fresh")


def _heading_level(styles: dict[str, _Style], style_id: str | None) -> int | None:
    if not style_id:
        return None
    name = styles.get(style_id).name if style_id in styles else style_id
    match = re.search(r"heading\s*([1-6])", f"{style_id} {name}", re.IGNORECASE)
    return int(match.group(1)) if match else None


def _inject_classes(
    value: str,
    tag_pattern: str,
    classes: tuple[str | None, ...],
) -> str:
    iterator = iter(classes)
    pattern = re.compile(rf"<({tag_pattern})(?=[\s>])", re.IGNORECASE)

    def replace(match: re.Match[str]) -> str:
        css_class = next(iterator, None)
        if not css_class:
            return match.group(0)
        return f'<{match.group(1)} class="{css_class}"'

    return pattern.sub(replace, value)


def _is_excluded(element: ET.Element, parents: dict[ET.Element, ET.Element]) -> bool:
    current = parents.get(element)
    while current is not None:
        if current.tag in _EXCLUDED_ANCESTORS:
            return True
        current = parents.get(current)
    return False


def _ancestor(
    element: ET.Element,
    parents: dict[ET.Element, ET.Element],
    tag: str,
) -> ET.Element | None:
    current = parents.get(element)
    while current is not None:
        if current.tag == tag:
            return current
        current = parents.get(current)
    return None


def _is_vertical_merge_continuation(cell: ET.Element) -> bool:
    merge = cell.find("w:tcPr/w:vMerge", _NS)
    return merge is not None and (_attr(merge, "w:val") or "continue") == "continue"


def _attr(element: ET.Element | None, name: str) -> str | None:
    return element.get(_q(name)) if element is not None else None


def _on_off(element: ET.Element) -> bool:
    return (_attr(element, "w:val") or "true") not in {"0", "false", "no", "off"}


def _number(value: object) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _twips(value: object) -> float | None:
    number = _number(value)
    return number / 20 if number is not None else None


def _half_points(value: object) -> float | None:
    number = _number(value)
    return number / 2 if number is not None else None


def _emu_points(value: object) -> float | None:
    number = _number(value)
    if number is None:
        return None
    return max(1, min(number / 12700, 2000))


def _clamp(value: object, minimum: float, maximum: float) -> float | None:
    number = _number(value)
    if number is None:
        return None
    return max(minimum, min(number, maximum))


def _font_kind(value: object) -> str:
    font = value.strip().casefold() if isinstance(value, str) else ""
    if any(name in font for name in ("arial", "aptos", "calibri", "helvetica")):
        return "sans"
    if any(name in font for name in ("courier", "consolas", "mono")):
        return "mono"
    return "serif"


def _font_children(children: list[object], latin_kind: str) -> list[object]:
    transformed: list[object] = []
    style_ids = {
        "cjk": "OCBFCjk",
        "mono": "OCBFMono",
        "sans": "OCBFSans",
        "serif": "OCBFSerif",
    }
    for child in children:
        if not isinstance(child, documents.Text) or not child.value:
            transformed.append(child)
            continue
        for segment in re.findall(
            r"[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff]+|"
            r"[^\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff]+",
            child.value,
        ):
            kind = (
                "cjk"
                if re.search(r"[\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff]", segment)
                else latin_kind
            )
            transformed.append(
                documents.run(
                    children=[documents.text(segment)],
                    style_id=style_ids[kind],
                )
            )
    return transformed


def _as_bool(value: object) -> bool | None:
    return value if isinstance(value, bool) else None


def _vertical_alignment(value: object) -> str | None:
    return str(value) if value in {"baseline", "subscript", "superscript"} else None


def _width_css(element: ET.Element | None) -> str | None:
    if element is None:
        return None
    width = _number(_attr(element, "w:w"))
    width_type = _attr(element, "w:type")
    if width is None or width <= 0:
        return None
    if width_type == "pct":
        return f"{max(1, min(width / 50, 100)):g}%"
    if width_type in {"dxa", None}:
        return f"{max(1, min(width / 20, 2000)):g}pt"
    return None


__all__ = ["DocxHtml", "convert_docx_to_html"]
