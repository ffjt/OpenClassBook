from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.dependencies import BookServiceDep
from app.schemas.book import BookCreate, BookResponse, BookUpdate

router = APIRouter(prefix="/books", tags=["Books / 书籍"])


def book_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "message": "Book not found",
            "message_zh": "未找到书籍",
        },
    )


@router.get(
    "",
    response_model=list[BookResponse],
    summary="List books / 获取书籍列表",
)
def list_books(
    service: BookServiceDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[BookResponse]:
    return [
        BookResponse.model_validate(book)
        for book in service.list(offset=offset, limit=limit)
    ]


@router.post(
    "",
    response_model=BookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a book / 创建书籍",
)
def create_book(data: BookCreate, service: BookServiceDep) -> BookResponse:
    return BookResponse.model_validate(service.create(data))


@router.get(
    "/{book_id}",
    response_model=BookResponse,
    summary="Get a book / 获取单本书籍",
)
def get_book(book_id: int, service: BookServiceDep) -> BookResponse:
    book = service.get(book_id)
    if book is None:
        raise book_not_found()
    return BookResponse.model_validate(book)


@router.patch(
    "/{book_id}",
    response_model=BookResponse,
    summary="Update a book / 更新书籍",
)
def update_book(
    book_id: int,
    data: BookUpdate,
    service: BookServiceDep,
) -> BookResponse:
    try:
        book = service.update(book_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "At least one field is required",
                "message_zh": "至少需要一个更新字段",
            },
        ) from error

    if book is None:
        raise book_not_found()
    return BookResponse.model_validate(book)


@router.delete(
    "/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a book / 删除书籍",
)
def delete_book(book_id: int, service: BookServiceDep) -> Response:
    if not service.delete(book_id):
        raise book_not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
