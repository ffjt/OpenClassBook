from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.repositories import (
    ArticleRepository,
    AuthorRepository,
    BookRepository,
    ExportRepository,
    JoinRepository,
    TemplateRepository,
    UploadRepository,
)
from app.services import (
    ArticleService,
    AuthorService,
    BookService,
    ExportService,
    JoinService,
    TemplateService,
    UploadService,
)
from app.services.page_asset_renderer import PageAssetRenderer
from app.services.pdf_renderer import PdfRenderer
from app.storage import LocalBookStorage

SessionDep = Annotated[Session, Depends(get_db)]


def get_book_service(session: SessionDep) -> BookService:
    return BookService(BookRepository(session))


def get_template_service(session: SessionDep) -> TemplateService:
    return TemplateService(TemplateRepository(session))


def get_author_service(session: SessionDep) -> AuthorService:
    return AuthorService(AuthorRepository(session))


def get_article_service(session: SessionDep) -> ArticleService:
    return ArticleService(ArticleRepository(session))


def get_join_service(session: SessionDep) -> JoinService:
    return JoinService(JoinRepository(session))


def get_export_service(session: SessionDep) -> ExportService:
    return ExportService(
        ExportRepository(session),
        PdfRenderer(),
        PageAssetRenderer(),
        LocalBookStorage(settings.storage_dir, settings.max_upload_size),
        settings.export_dir,
    )


def get_upload_service(session: SessionDep) -> UploadService:
    return UploadService(
        UploadRepository(session),
        LocalBookStorage(settings.storage_dir, settings.max_upload_size),
    )


BookServiceDep = Annotated[BookService, Depends(get_book_service)]
TemplateServiceDep = Annotated[TemplateService, Depends(get_template_service)]
AuthorServiceDep = Annotated[AuthorService, Depends(get_author_service)]
ArticleServiceDep = Annotated[ArticleService, Depends(get_article_service)]
JoinServiceDep = Annotated[JoinService, Depends(get_join_service)]
ExportServiceDep = Annotated[ExportService, Depends(get_export_service)]
UploadServiceDep = Annotated[UploadService, Depends(get_upload_service)]
