import mimetypes
from datetime import UTC, datetime
from pathlib import Path

from fastapi import UploadFile

from app.repositories.upload import UploadRepository
from app.schemas.upload import UploadResponse, UploadType
from app.storage.local import (
    FileTooLargeError,
    InvalidFileContentError,
    LocalBookStorage,
    StoredFile,
)

MEDIA_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}
COVER_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}


class UnsupportedFileFormatError(Exception):
    pass


class ProtectedUploadError(Exception):
    pass


class UploadService:
    def __init__(
        self,
        repository: UploadRepository,
        storage: LocalBookStorage,
    ) -> None:
        self.repository = repository
        self.storage = storage

    async def upload(
        self,
        book_id: int,
        upload_type: UploadType,
        upload: UploadFile,
    ) -> UploadResponse | None:
        if self.repository.get_book(book_id) is None:
            await upload.close()
            return None

        extension, media_type = _validate_upload(upload_type, upload)
        previous_path = self.repository.get_path(book_id, upload_type)
        stored = await self.storage.save(
            book_id=book_id,
            upload_type=upload_type,
            upload=upload,
            extension=extension,
            media_type=media_type,
        )
        try:
            self.repository.set_path(
                book_id,
                upload_type,
                stored.relative_path,
                stored.uploaded_at,
            )
        except Exception:
            self.storage.delete(stored.relative_path)
            raise

        if previous_path and previous_path != stored.relative_path:
            self.storage.delete(previous_path)
        return _to_response(stored)

    def get_file(
        self,
        book_id: int,
        upload_type: UploadType,
    ) -> tuple[Path, str, str] | None:
        relative_path = self.repository.get_path(book_id, upload_type)
        if relative_path is None:
            return None
        path = self.storage.resolve(relative_path)
        if path is None:
            return None
        media_type = MEDIA_TYPES.get(path.suffix.lower()) or (
            mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        )
        return path, relative_path, media_type

    def delete(self, book_id: int, upload_type: UploadType) -> bool:
        if self.repository.get_book(book_id) is None:
            return False
        if upload_type in {"cover", "back_cover"}:
            raise ProtectedUploadError
        relative_path = self.repository.get_path(book_id, upload_type)
        if relative_path:
            self.storage.delete(relative_path)
        self.repository.set_path(book_id, upload_type, None, datetime.now(UTC))
        return True


def _validate_upload(
    upload_type: UploadType,
    upload: UploadFile,
) -> tuple[str, str]:
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in MEDIA_TYPES:
        raise UnsupportedFileFormatError
    if upload_type in {"cover", "back_cover"} and extension not in COVER_EXTENSIONS:
        raise UnsupportedFileFormatError

    expected_media_type = MEDIA_TYPES[extension]
    declared_media_type = (upload.content_type or "").lower()
    if declared_media_type not in {
        "",
        "application/octet-stream",
        expected_media_type,
    }:
        raise UnsupportedFileFormatError
    return extension, expected_media_type


def _to_response(stored: StoredFile) -> UploadResponse:
    return UploadResponse(
        file_name=stored.file_name,
        file_size=stored.file_size,
        file_type=stored.file_type,
        path=stored.relative_path,
        uploaded_at=stored.uploaded_at,
    )


__all__ = [
    "FileTooLargeError",
    "InvalidFileContentError",
    "ProtectedUploadError",
    "UnsupportedFileFormatError",
    "UploadService",
]
