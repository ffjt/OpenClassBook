from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import ArticleServiceDep
from app.schemas.article import (
    ArticleCreate,
    ArticleNumberAssignment,
    ArticleOrderAssignment,
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
    "/authors/{author_id}/articles",
    response_model=list[ArticleResponse],
    summary="List an author's articles / 获取作者文章列表",
)
def list_author_articles(
    author_id: int,
    service: ArticleServiceDep,
) -> list[ArticleResponse]:
    if not service.author_exists(author_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Author not found", "message_zh": "未找到作者"},
        )
    return [
        ArticleResponse.model_validate(article)
        for article in service.list_by_author(author_id)
    ]


@router.get(
    "/books/{book_id}/articles",
    response_model=list[ArticleResponse],
    summary="List book articles / 获取书籍文章列表",
)
def list_articles(
    book_id: int,
    service: ArticleServiceDep,
    include_drafts: bool = True,
) -> list[ArticleResponse]:
    if not service.book_exists(book_id):
        raise book_not_found()
    return [
        ArticleResponse.model_validate(article)
        for article in service.list_by_book(
            book_id,
            include_drafts=include_drafts,
        )
    ]


@router.patch(
    "/books/{book_id}/articles/numbers",
    response_model=list[ArticleResponse],
    summary="Assign article numbers in layout order / 按排版顺序分配文章编号",
)
def assign_article_numbers(
    book_id: int,
    data: ArticleNumberAssignment,
    service: ArticleServiceDep,
) -> list[ArticleResponse]:
    try:
        articles = service.assign_numbers(book_id, data)
    except LookupError:
        raise book_not_found() from None
    except ValueError as error:
        if str(error) == "layout_numbering_required":
            detail = {
                "message": (
                    "Layout numbering is only available when article numbering "
                    "is disabled"
                ),
                "message_zh": "只有不使用文章编号的书籍才能在排版时统一添加编号",
            }
        else:
            detail = {
                "message": "The order must include every approved article exactly once",
                "message_zh": "排序必须且只能包含全部已通过审核的文章",
            }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        ) from error

    return [ArticleResponse.model_validate(article) for article in articles]


@router.patch(
    "/books/{book_id}/articles/order",
    response_model=list[ArticleResponse],
    summary="Save article publication order / 保存文章出版顺序",
)
def arrange_articles(
    book_id: int,
    data: ArticleOrderAssignment,
    service: ArticleServiceDep,
) -> list[ArticleResponse]:
    try:
        articles = service.arrange_layout(book_id, data)
    except LookupError:
        raise book_not_found() from None
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "The order must include every approved article exactly once",
                "message_zh": "排序必须且只能包含全部已通过审核的文章",
            },
        ) from error
    return [ArticleResponse.model_validate(article) for article in articles]


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
    try:
        article = service.create(book_id, data)
    except ValueError as error:
        if str(error) == "article_number_required":
            detail = {
                "message": "Claim an article number before creating the article",
                "message_zh": "创建文章前请先认领编号",
            }
        else:
            detail = {
                "message": "This article number has already been claimed",
                "message_zh": "这个文章编号已被认领",
            }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        ) from error
    return ArticleResponse.model_validate(article)


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
