from pathlib import Path

import pytest
from reportlab.pdfgen import canvas

from app.services import docx_word_converter


def _write_pdf(path: Path, text: str = "Microsoft Word output") -> None:
    output = canvas.Canvas(str(path))
    output.drawString(72, 720, text)
    output.showPage()
    output.save()


def test_word_converter_skips_unsupported_platform(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    docx_word_converter.word_conversion_available.cache_clear()
    monkeypatch.setattr(docx_word_converter.sys, "platform", "linux")
    assert docx_word_converter.word_conversion_available() is False
    docx_word_converter.word_conversion_available.cache_clear()


def test_word_converter_validates_successful_pdf(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.docx"
    destination = tmp_path / "destination.pdf"
    source.write_bytes(b"docx placeholder")
    monkeypatch.setattr(
        docx_word_converter,
        "word_conversion_available",
        lambda: True,
    )
    monkeypatch.setattr(
        docx_word_converter,
        "_convert",
        lambda source_path, destination_path: _write_pdf(destination_path),
    )

    result = docx_word_converter.convert_docx_with_word(source, destination)
    assert result.converted is True
    assert result.attempted is True
    assert destination.is_file()


def test_word_converter_removes_partial_pdf_before_fallback(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.docx"
    destination = tmp_path / "partial.pdf"
    source.write_bytes(b"docx placeholder")
    monkeypatch.setattr(
        docx_word_converter,
        "word_conversion_available",
        lambda: True,
    )

    def fail_conversion(source_path: Path, destination_path: Path) -> None:
        destination_path.write_bytes(b"partial")
        raise RuntimeError("Word failed")

    monkeypatch.setattr(docx_word_converter, "_convert", fail_conversion)
    result = docx_word_converter.convert_docx_with_word(source, destination)
    assert result.converted is False
    assert result.attempted is True
    assert not destination.exists()
