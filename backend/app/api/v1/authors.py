from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.dependencies import AuthorServiceDep, JoinServiceDep
from app.schemas.author import (
    AuthorCreate,
    AuthorDetailResponse,
    AuthorPreviewResponse,
    AuthorResponse,
    AuthorUpdate,
    LatestArticlePreview,
)
from app.schemas.book import BookResponse

router = APIRouter(tags=["Authors / 作者"])


def author_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"message": "Author not found", "message_zh": "未找到作者"},
    )


def book_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"message": "Book not found", "message_zh": "未找到书籍"},
    )


@router.get(
    "/books/{book_id}/authors/search",
    response_model=list[AuthorResponse],
    summary="Search authors by display name / 按显示名称搜索作者",
)
def search_authors(
    book_id: int,
    service: AuthorServiceDep,
    name: str = Query(min_length=1, max_length=120),
) -> list[AuthorResponse]:
    if not service.book_exists(book_id):
        raise book_not_found()
    if not name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Name cannot be blank",
                "message_zh": "姓名不能为空",
            },
        )
    return [
        AuthorResponse.model_validate(author)
        for author in service.search_by_name(book_id, name)
    ]


@router.get(
    "/books/{book_id}/authors",
    response_model=list[AuthorResponse],
    summary="List book authors / 获取书籍作者列表",
)
def list_authors(book_id: int, service: AuthorServiceDep) -> list[AuthorResponse]:
    if not service.book_exists(book_id):
        raise book_not_found()
    return [
        AuthorResponse.model_validate(author)
        for author in service.list_by_book(book_id)
    ]


@router.post(
    "/books/{book_id}/authors",
    response_model=AuthorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an author / 创建作者",
)
def create_author(
    book_id: int,
    data: AuthorCreate,
    service: AuthorServiceDep,
) -> AuthorResponse:
    if not service.book_exists(book_id):
        raise book_not_found()
    return AuthorResponse.model_validate(service.create(book_id, data))


@router.get(
    "/authors/{author_id}",
    response_model=AuthorDetailResponse,
    summary="Get an author / 获取作者",
)
def get_author(
    author_id: int,
    service: JoinServiceDep,
) -> AuthorDetailResponse:
    result = service.get_author(author_id)
    if result is None:
        raise author_not_found()
    author, book = result
    return AuthorDetailResponse(
        **AuthorResponse.model_validate(author).model_dump(),
        book=BookResponse.model_validate(book),
    )


@router.get(
    "/authors/{author_id}/preview",
    response_model=AuthorPreviewResponse,
    summary="Preview an author's latest article / 预览作者最近文章",
)
def preview_author(
    author_id: int,
    service: AuthorServiceDep,
) -> AuthorPreviewResponse:
    result = service.get_preview(author_id)
    if result is None:
        raise author_not_found()
    article_count, latest = result
    return AuthorPreviewResponse(
        article_count=article_count,
        latest_article=(
            LatestArticlePreview(
                title=latest.title,
                excerpt=latest.content[:120],
                status=latest.status,
                updated_at=latest.updated_at,
            )
            if latest
            else None
        ),
    )


@router.patch(
    "/authors/{author_id}",
    response_model=AuthorResponse,
    summary="Update an author / 更新作者",
)
def update_author(
    author_id: int,
    data: AuthorUpdate,
    service: AuthorServiceDep,
) -> AuthorResponse:
    try:
        author = service.update(author_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "At least one field is required",
                "message_zh": "至少需要一个更新字段",
            },
        ) from error

    if author is None:
        raise author_not_found()
    return AuthorResponse.model_validate(author)


@router.delete(
    "/authors/{author_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an author / 删除作者",
)
def delete_author(author_id: int, service: AuthorServiceDep) -> Response:
    if not service.delete(author_id):
        raise author_not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
