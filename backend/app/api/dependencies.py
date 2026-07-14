from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.repositories import (
    ArticleRepository,
    AuthorRepository,
    BookRepository,
    TemplateRepository,
)
from app.services import ArticleService, AuthorService, BookService, TemplateService

SessionDep = Annotated[Session, Depends(get_db)]


def get_book_service(session: SessionDep) -> BookService:
    return BookService(BookRepository(session))


def get_template_service(session: SessionDep) -> TemplateService:
    return TemplateService(TemplateRepository(session))


def get_author_service(session: SessionDep) -> AuthorService:
    return AuthorService(AuthorRepository(session))


def get_article_service(session: SessionDep) -> ArticleService:
    return ArticleService(ArticleRepository(session))


BookServiceDep = Annotated[BookService, Depends(get_book_service)]
TemplateServiceDep = Annotated[TemplateService, Depends(get_template_service)]
AuthorServiceDep = Annotated[AuthorService, Depends(get_author_service)]
ArticleServiceDep = Annotated[ArticleService, Depends(get_article_service)]
