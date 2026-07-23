from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.email_provider import EmailProvider, get_email_provider
from app.models.user import User
from app.repositories import (
    ArticleRepository,
    AuthorRepository,
    AuthRepository,
    BookRepository,
    ExportRepository,
    JoinRepository,
    TemplateRepository,
    UploadRepository,
)
from app.services import (
    ArticleService,
    AuthorService,
    AuthService,
    BookService,
    EmailVerificationService,
    ExportService,
    JoinService,
    TemplateService,
    UploadService,
)
from app.services.page_asset_renderer import PageAssetRenderer
from app.services.pdf_renderer import PdfRenderer
from app.storage import LocalBookStorage

SessionDep = Annotated[Session, Depends(get_db)]
bearer_scheme = HTTPBearer(auto_error=False)


def get_email_provider_dependency() -> EmailProvider:
    return get_email_provider()


EmailProviderDep = Annotated[EmailProvider, Depends(get_email_provider_dependency)]


def get_auth_service(session: SessionDep, provider: EmailProviderDep) -> AuthService:
    repository = AuthRepository(session)
    return AuthService(
        repository,
        EmailVerificationService(repository, provider, settings),
        settings,
    )


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
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def get_current_user(
    service: AuthServiceDep,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "authentication_required",
                "message": "Authentication is required.",
                "message_zh": "需要登录后才能继续。",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return service.current_user(credentials.credentials)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_access_token",
                "message": "Your sign-in has expired. Please sign in again.",
                "message_zh": "登录状态已过期，请重新登录。",
            },
            headers={"WWW-Authenticate": "Bearer"},
        ) from error


CurrentUserDep = Annotated[User, Depends(get_current_user)]
