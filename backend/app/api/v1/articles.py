from fastapi import APIRouter

from app.api.dependencies import ArticleServiceDep
from app.schemas.article import ArticleCreate, ArticleResponse, ArticleUpdate
from app.schemas.common import MessageResponse

router = APIRouter(tags=["Articles / 文章"])


@router.get("/books/{book_id}/articles", response_model=list[ArticleResponse])
def list_articles(
    book_id: int,
    service: ArticleServiceDep,
) -> list[ArticleResponse]:
    return [
        ArticleResponse.model_validate(article)
        for article in service.list_by_book(book_id)
    ]


@router.post("/articles", response_model=MessageResponse)
def create_article(
    _data: ArticleCreate,
    service: ArticleServiceDep,
) -> MessageResponse:
    return service.not_implemented()


@router.get("/articles/{article_id}", response_model=MessageResponse)
def get_article(article_id: int, service: ArticleServiceDep) -> MessageResponse:
    return service.not_implemented()


@router.patch("/articles/{article_id}", response_model=MessageResponse)
def update_article(
    article_id: int,
    _data: ArticleUpdate,
    service: ArticleServiceDep,
) -> MessageResponse:
    return service.not_implemented()


@router.patch("/articles/{article_id}/status", response_model=MessageResponse)
def update_article_status(
    article_id: int,
    _data: ArticleUpdate,
    service: ArticleServiceDep,
) -> MessageResponse:
    return service.not_implemented()
