from datetime import datetime

from sqlalchemy.orm import Session

from app.models.book import Book
from app.schemas.upload import UploadType

FILE_FIELD_BY_TYPE: dict[UploadType, str] = {
    "cover": "cover_file",
    "preface": "preface_file",
    "afterword": "afterword_file",
    "acknowledgement": "acknowledgement_file",
    "back_cover": "back_cover_file",
}


class UploadRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_book(self, book_id: int) -> Book | None:
        return self.session.get(Book, book_id)

    def get_path(self, book_id: int, upload_type: UploadType) -> str | None:
        book = self.get_book(book_id)
        if book is None:
            return None
        return getattr(book, FILE_FIELD_BY_TYPE[upload_type])

    def set_path(
        self,
        book_id: int,
        upload_type: UploadType,
        path: str | None,
        updated_at: datetime,
    ) -> Book | None:
        book = self.get_book(book_id)
        if book is None:
            return None

        setattr(book, FILE_FIELD_BY_TYPE[upload_type], path)
        if book.layout_sections:
            book.layout_sections = [
                {**section, "file": path}
                if section.get("preset") == upload_type
                else dict(section)
                for section in book.layout_sections
            ]
        book.updated_at = updated_at
        self.session.commit()
        self.session.refresh(book)
        return book
