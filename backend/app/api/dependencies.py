import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.email_provider import EmailProvider, get_email_provider
from app.models.article import Article
from app.models.author import Author
from app.models.book import Book
from app.models.user import User
from app.repositories import (
    ArticleRepository,
    AuthorRepository,
    AuthRepository,
    BookRepository,
    ExportRepository,
    InvitationRepository,
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
    InvitationService,
    JoinService,
    TemplateService,
    UploadService,
)
from app.services.auth import AuthenticationError, AuthorPrincipal
from app.services.page_asset_renderer import PageAssetRenderer
from app.services.pdf_renderer import PdfRenderer
from app.storage import LocalBookStorage

SessionDep = Annotated[Session, Depends(get_db)]
bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


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
    return BookService(BookRepository(session), InvitationRepository(session))


def get_invitation_service(session: SessionDep) -> InvitationService:
    return InvitationService(InvitationRepository(session))


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
InvitationServiceDep = Annotated[InvitationService, Depends(get_invitation_service)]
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
        logger.warning("security_event=access_token_denied")
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


def get_current_actor(
    service: AuthServiceDep,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> User | AuthorPrincipal:
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
    except AuthenticationError:
        try:
            return service.current_author(credentials.credentials)
        except AuthenticationError as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "invalid_access_token",
                    "message": "Your sign-in has expired. Please sign in again.",
                    "message_zh": "登录状态已过期，请重新登录。",
                },
                headers={"WWW-Authenticate": "Bearer"},
            ) from error


type CurrentActor = User | AuthorPrincipal
CurrentActorDep = Annotated[CurrentActor, Depends(get_current_actor)]


def get_owned_book(
    book_id: int,
    user: CurrentUserDep,
    service: BookServiceDep,
) -> Book:
    book = service.get_for_owner(book_id, user.id)
    if book is None:
        logger.warning("security_event=permission_denied resource=book")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "book_not_found",
                "message": "Book not found.",
                "message_zh": "未找到书籍。",
            },
        )
    return book


OwnedBookDep = Annotated[Book, Depends(get_owned_book)]


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "resource_not_found",
            "message": "Resource not found.",
            "message_zh": "未找到资源。",
        },
    )


def get_author_for_actor(
    author_id: int,
    actor: CurrentActorDep,
    author_service: AuthorServiceDep,
    book_service: BookServiceDep,
) -> Author:
    author = author_service.get(author_id)
    if author is None:
        raise _not_found()
    if isinstance(actor, AuthorPrincipal):
        if actor.author_id == author.id and actor.author_uuid == str(author.uuid):
            return author
        raise _not_found()
    book = book_service.get_for_owner(author.book_id, actor.id)
    if book is None:
        raise _not_found()
    return author


AuthorizedAuthorDep = Annotated[Author, Depends(get_author_for_actor)]


def get_book_for_actor(
    book_id: int,
    actor: CurrentActorDep,
    author_service: AuthorServiceDep,
    book_service: BookServiceDep,
) -> Book:
    if isinstance(actor, User):
        book = book_service.get_for_owner(book_id, actor.id)
        if book is not None:
            return book
        raise _not_found()
    author = author_service.get(actor.author_id)
    if (
        author is not None
        and author.book_id == book_id
        and str(author.uuid) == actor.author_uuid
    ):
        book = book_service.get(book_id)
        if book is not None:
            return book
    raise _not_found()


AuthorizedBookDep = Annotated[Book, Depends(get_book_for_actor)]


def get_article_for_actor(
    article_id: int,
    actor: CurrentActorDep,
    article_service: ArticleServiceDep,
    author_service: AuthorServiceDep,
    book_service: BookServiceDep,
) -> Article:
    article = article_service.get(article_id)
    if article is None:
        raise _not_found()
    author = author_service.get(article.author_id)
    if author is None or author.book_id != article.book_id:
        raise _not_found()
    if isinstance(actor, AuthorPrincipal):
        if actor.author_id == author.id and actor.author_uuid == str(author.uuid):
            return article
        raise _not_found()
    if book_service.get_for_owner(article.book_id, actor.id) is None:
        raise _not_found()
    return article


AuthorizedArticleDep = Annotated[Article, Depends(get_article_for_actor)]


def get_owned_article(
    article_id: int,
    user: CurrentUserDep,
    article_service: ArticleServiceDep,
    book_service: BookServiceDep,
) -> Article:
    article = article_service.get(article_id)
    if article is None or book_service.get_for_owner(article.book_id, user.id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "article_not_found",
                "message": "Article not found.",
                "message_zh": "未找到文章。",
            },
        )
    return article


OwnedArticleDep = Annotated[Article, Depends(get_owned_article)]


def get_owned_author(
    author_id: int,
    user: CurrentUserDep,
    author_service: AuthorServiceDep,
    book_service: BookServiceDep,
) -> Author:
    author = author_service.get(author_id)
    if author is None or book_service.get_for_owner(author.book_id, user.id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "author_not_found",
                "message": "Author not found.",
                "message_zh": "未找到作者。",
            },
        )
    return author


OwnedAuthorDep = Annotated[Author, Depends(get_owned_author)]
