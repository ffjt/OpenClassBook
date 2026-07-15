import io
from pathlib import Path

import pytest
from docx import Document
from docx.shared import Inches
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.core.config import settings


def _image_bytes(image_format: str = "PNG") -> bytes:
    output = io.BytesIO()
    image = Image.new("RGBA", (180, 120), (79, 124, 255, 180))
    if image_format in {"JPEG", "WEBP"}:
        image = image.convert("RGB")
    image.save(output, format=image_format)
    return output.getvalue()


def _docx_bytes() -> bytes:
    output = io.BytesIO()
    document = Document()
    document.add_heading("DOCX section heading", level=1)
    document.add_paragraph("DOCX section content / 文档内容")
    document.add_paragraph("First list item", style="List Bullet")
    table = document.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Name"
    table.cell(0, 1).text = "Value"
    table.cell(1, 0).text = "Language"
    table.cell(1, 1).text = "中英文"
    document.add_picture(io.BytesIO(_image_bytes()), width=Inches(1.2))
    document.save(output)
    return output.getvalue()


def _pdf_bytes(*labels: str) -> bytes:
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=(360, 540))
    for label in labels:
        pdf.drawString(48, 480, label)
        pdf.showPage()
    pdf.save()
    return output.getvalue()


def _encrypted_pdf_bytes() -> bytes:
    source = PdfReader(io.BytesIO(_pdf_bytes("Secret page")))
    writer = PdfWriter()
    writer.add_page(source.pages[0])
    writer.encrypt("secret")
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def _create_book(client: TestClient, title: str = "Parsed assets") -> dict[str, object]:
    return client.post(
        "/api/v1/books",
        json={"title": title, "owner_name": "Editor", "number_mode": "none"},
    ).json()


def _upload(
    client: TestClient,
    book_id: int,
    upload_type: str,
    name: str,
    content: bytes,
    media_type: str,
) -> None:
    response = client.post(
        f"/api/v1/books/{book_id}/upload",
        data={"type": upload_type},
        files={"file": (name, content, media_type)},
    )
    assert response.status_code == 200, response.text


def test_mixed_docx_pdf_and_images_are_rendered_in_layout_order(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    storage_dir = tmp_path / "storage"
    export_dir = tmp_path / "exports"
    monkeypatch.setattr(settings, "storage_dir", storage_dir)
    monkeypatch.setattr(settings, "export_dir", export_dir)
    book = _create_book(client)
    book_id = int(book["id"])
    client.patch(
        f"/api/v1/books/{book_id}",
        json={
            "layout_sections": [
                {"id": "cover", "kind": "page", "preset": "cover"},
                {"id": "preface", "kind": "page", "preset": "preface"},
                {"id": "articles", "kind": "articles", "preset": "articles"},
                {"id": "afterword", "kind": "page", "preset": "afterword"},
                {
                    "id": "back_cover",
                    "kind": "page",
                    "preset": "back_cover",
                },
            ]
        },
    )
    _upload(client, book_id, "cover", "cover.png", _image_bytes(), "image/png")
    _upload(
        client,
        book_id,
        "preface",
        "preface.docx",
        _docx_bytes(),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    _upload(
        client,
        book_id,
        "afterword",
        "afterword.pdf",
        _pdf_bytes("PDF afterword page one", "PDF afterword page two"),
        "application/pdf",
    )
    _upload(
        client,
        book_id,
        "back_cover",
        "back.webp",
        _image_bytes("WEBP"),
        "image/webp",
    )
    author = client.post(
        f"/api/v1/books/{book_id}/authors",
        json={"name": "Student"},
    ).json()
    article = client.post(
        f"/api/v1/books/{book_id}/articles",
        json={
            "author_id": author["id"],
            "title": "Approved article marker",
            "content": "Approved article content",
            "status": "approved",
        },
    )
    assert article.status_code == 201

    preview = client.get(f"/api/v1/books/{book_id}/export").json()
    assert preview["can_export"] is True
    assert preview["stats"]["estimated_page_count"] == 6
    assert preview["stats"]["image_count"] == 3
    assert [page["label_en"] for page in preview["preview_pages"]] == [
        "Cover",
        "Preface",
        "Approved article marker",
        "Afterword · 1/2",
        "Afterword · 2/2",
        "Back cover",
    ]
    assert [page["is_placeholder"] for page in preview["preview_pages"]] == [
        False,
        False,
        True,
        False,
        False,
        False,
    ]

    generated = client.post(f"/api/v1/books/{book_id}/export")
    assert generated.status_code == 200, generated.text
    result = generated.json()
    assert result["page_count"] == 6
    artifact = export_dir / f"book-{book_id}-{result['task_id']}.pdf"
    reader = PdfReader(artifact)
    assert len(reader.pages) == 6
    assert all(
        abs(float(page.mediabox.width) - A4[0]) < 0.1
        and abs(float(page.mediabox.height) - A4[1]) < 0.1
        for page in reader.pages
    )
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert text.index("DOCX section content") < text.index("Approved article marker")
    assert text.index("Approved article marker") < text.index("PDF afterword page one")
    assert text.index("PDF afterword page one") < text.index("PDF afterword page two")


def test_uploaded_asset_without_approved_articles_can_export(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(settings, "storage_dir", tmp_path / "storage")
    monkeypatch.setattr(settings, "export_dir", tmp_path / "exports")
    book = _create_book(client, "Assets only")
    book_id = int(book["id"])
    _upload(
        client,
        book_id,
        "preface",
        "preface.pdf",
        _pdf_bytes("Only uploaded content"),
        "application/pdf",
    )

    preview = client.get(f"/api/v1/books/{book_id}/export").json()
    assert preview["stats"]["article_count"] == 0
    assert preview["can_export"] is True
    generated = client.post(f"/api/v1/books/{book_id}/export")
    assert generated.status_code == 200
    assert generated.json()["page_count"] >= 1


def test_missing_source_blocks_preview_and_returns_bilingual_export_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    storage_dir = tmp_path / "storage"
    monkeypatch.setattr(settings, "storage_dir", storage_dir)
    monkeypatch.setattr(settings, "export_dir", tmp_path / "exports")
    book = _create_book(client, "Missing source")
    book_id = int(book["id"])
    _upload(
        client,
        book_id,
        "preface",
        "preface.pdf",
        _pdf_bytes("Will be removed"),
        "application/pdf",
    )
    (storage_dir / f"books/{book_id}/preface/preface.pdf").unlink()

    preview = client.get(f"/api/v1/books/{book_id}/export").json()
    assert preview["can_export"] is False
    assert "前言文件不存在，请替换后再导出。" in preview["warnings_zh"]
    generated = client.post(f"/api/v1/books/{book_id}/export")
    assert generated.status_code == 422
    assert generated.json()["detail"] == {
        "code": "source_file_unreadable",
        "message": "Preface file cannot be parsed. Replace it before export.",
        "message_zh": "前言文件无法解析，请替换后再导出。",
    }


def test_encrypted_pdf_is_rejected_during_upload(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(settings, "storage_dir", tmp_path)
    book_id = int(_create_book(client, "Encrypted source")["id"])
    response = client.post(
        f"/api/v1/books/{book_id}/upload",
        data={"type": "preface"},
        files={
            "file": (
                "protected.pdf",
                _encrypted_pdf_bytes(),
                "application/pdf",
            )
        },
    )
    assert response.status_code == 415
    assert response.json()["detail"]["message_zh"] == "不支持的文件格式。"
