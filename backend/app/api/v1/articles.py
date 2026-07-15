from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import ArticleServiceDep
from app.schemas.article import (
    ArticleCreate,
    ArticleResponse,
    ArticleStatusUpdate,
    ArticleUpdate,
)

router = APIRouter(tags=["Articles / 文章"])


def article_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"message": "Article not found", "message_zh": "未找到文章"},
    )


def book_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"message": "Book not found", "message_zh": "未找到书籍"},
    )


def author_not_in_book() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "message": "Author does not belong to this book",
            "message_zh": "作者不属于这本书",
        },
    )


@router.get(
    "/books/{book_id}/articles",
    response_model=list[ArticleResponse],
    summary="List book articles / 获取书籍文章列表",
)
def list_articles(
    book_id: int,
    service: ArticleServiceDep,
) -> list[ArticleResponse]:
    if not service.book_exists(book_id):
        raise book_not_found()
    return [
        ArticleResponse.model_validate(article)
        for article in service.list_by_book(book_id)
    ]


@router.post(
    "/books/{book_id}/articles",
    response_model=ArticleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an article / 创建文章",
)
def create_article(
    book_id: int,
    data: ArticleCreate,
    service: ArticleServiceDep,
) -> ArticleResponse:
    if not service.book_exists(book_id):
        raise book_not_found()
    if not service.author_belongs_to_book(data.author_id, book_id):
        raise author_not_in_book()
    return ArticleResponse.model_validate(service.create(book_id, data))


@router.get(
    "/articles/{article_id}",
    response_model=ArticleResponse,
    summary="Get an article / 获取文章",
)
def get_article(article_id: int, service: ArticleServiceDep) -> ArticleResponse:
    article = service.get(article_id)
    if article is None:
        raise article_not_found()
    return ArticleResponse.model_validate(article)


@router.patch(
    "/articles/{article_id}",
    response_model=ArticleResponse,
    summary="Update an article / 更新文章",
)
def update_article(
    article_id: int,
    data: ArticleUpdate,
    service: ArticleServiceDep,
) -> ArticleResponse:
    current = service.get(article_id)
    if current is None:
        raise article_not_found()
    if data.author_id is not None and not service.author_belongs_to_book(
        data.author_id,
        current.book_id,
    ):
        raise author_not_in_book()

    try:
        article = service.update(article_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "At least one field is required",
                "message_zh": "至少需要一个更新字段",
            },
        ) from error

    return ArticleResponse.model_validate(article)


@router.delete(
    "/articles/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an article / 删除文章",
)
def delete_article(article_id: int, service: ArticleServiceDep) -> Response:
    if not service.delete(article_id):
        raise article_not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/articles/{article_id}/status",
    response_model=ArticleResponse,
    summary="Update article status / 更新文章状态",
)
def update_article_status(
    article_id: int,
    data: ArticleStatusUpdate,
    service: ArticleServiceDep,
) -> ArticleResponse:
    article = service.update_status(article_id, data)
    if article is None:
        raise article_not_found()
    return ArticleResponse.model_validate(article)
