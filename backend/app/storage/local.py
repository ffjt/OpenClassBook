import os
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from zipfile import BadZipFile, ZipFile

import mammoth
from fastapi import UploadFile
from PIL import Image as PillowImage
from pypdf import PdfReader

CHUNK_SIZE = 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_DOCX_ENTRIES = 10_000
MAX_DOCX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024
MAX_DOCX_COMPRESSION_RATIO = 100


class FileTooLargeError(Exception):
    pass


class InvalidFileContentError(Exception):
    pass


@dataclass(frozen=True)
class StoredFile:
    file_name: str
    file_size: int
    file_type: str
    relative_path: str
    absolute_path: Path
    uploaded_at: datetime


class LocalBookStorage:
    def __init__(self, root: Path, max_file_size: int) -> None:
        self.root = root.resolve()
        self.max_file_size = max_file_size
        self.root.mkdir(parents=True, exist_ok=True)

    async def save(
        self,
        *,
        book_id: int,
        upload_type: str,
        upload: UploadFile,
        extension: str,
        media_type: str,
    ) -> StoredFile:
        file_name = _safe_filename(upload.filename or "")
        directory = self.root / "books" / str(book_id) / upload_type
        directory.mkdir(parents=True, exist_ok=True)
        destination = directory / file_name
        temporary = directory / f".{file_name}.uploading"
        file_size = 0

        try:
            with temporary.open("wb") as output:
                while chunk := await upload.read(CHUNK_SIZE):
                    file_size += len(chunk)
                    if file_size > self.max_file_size:
                        raise FileTooLargeError
                    output.write(chunk)
            if not _content_matches_extension(temporary, extension):
                raise InvalidFileContentError
            os.replace(temporary, destination)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise
        finally:
            await upload.close()

        uploaded_at = datetime.fromtimestamp(destination.stat().st_mtime, tz=UTC)
        return StoredFile(
            file_name=file_name,
            file_size=file_size,
            file_type=media_type,
            relative_path=destination.relative_to(self.root).as_posix(),
            absolute_path=destination,
            uploaded_at=uploaded_at,
        )

    def resolve(self, relative_path: str) -> Path | None:
        candidate = (self.root / relative_path).resolve()
        if not candidate.is_relative_to(self.root) or not candidate.is_file():
            return None
        return candidate

    def delete(self, relative_path: str) -> None:
        path = self.resolve(relative_path)
        if path is not None:
            path.unlink()
            _remove_empty_parents(path.parent, self.root)


def _safe_filename(filename: str) -> str:
    name = Path(filename.replace("\\", "/")).name.strip()
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    if not name or name in {".", ".."}:
        raise InvalidFileContentError
    if len(name) > 200:
        suffix = Path(name).suffix
        name = f"{Path(name).stem[: 200 - len(suffix)]}{suffix}"
    return name


def _content_matches_extension(path: Path, extension: str) -> bool:
    try:
        if extension == ".pdf":
            reader = PdfReader(path, strict=False)
            return not reader.is_encrypted and bool(reader.pages)
        if extension in {".png", ".jpg", ".jpeg", ".webp"}:
            expected = {
                ".png": "PNG",
                ".jpg": "JPEG",
                ".jpeg": "JPEG",
                ".webp": "WEBP",
            }[extension]
            with PillowImage.open(path) as image:
                detected = image.format
                width, height = image.size
                if width * height > MAX_IMAGE_PIXELS:
                    return False
                image.verify()
            return detected == expected
        if extension != ".docx":
            return False
        try:
            with ZipFile(path) as archive:
                entries = archive.infolist()
                if len(entries) > MAX_DOCX_ENTRIES:
                    return False
                total_uncompressed = sum(entry.file_size for entry in entries)
                if total_uncompressed > MAX_DOCX_UNCOMPRESSED_SIZE:
                    return False
                if any(
                    (entry.file_size > 0 and entry.compress_size == 0)
                    or (
                        entry.compress_size > 0
                        and entry.file_size / entry.compress_size
                        > MAX_DOCX_COMPRESSION_RATIO
                    )
                    for entry in entries
                ):
                    return False
                names = {entry.filename for entry in entries}
        except BadZipFile:
            return False
        if "[Content_Types].xml" not in names or "word/document.xml" not in names:
            return False
        with path.open("rb") as document:
            mammoth.convert_to_html(document)
        return True
    except Exception:
        return False


def _remove_empty_parents(directory: Path, root: Path) -> None:
    while directory != root:
        try:
            directory.rmdir()
        except OSError:
            return
        directory = directory.parent
