from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)

from app.api.dependencies import BookServiceDep, UploadServiceDep
from app.schemas.book import BookCreate, BookResponse, BookUpdate
from app.schemas.upload import UploadResponse, UploadType
from app.services.upload import (
    FileTooLargeError,
    InvalidFileContentError,
    UnsupportedFileFormatError,
)

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


@router.post(
    "/{book_id}/upload",
    response_model=UploadResponse,
    summary="Upload a publication file / 上传出版文件",
)
async def upload_book_file(
    book_id: int,
    service: UploadServiceDep,
    file: Annotated[UploadFile, File(description="File / 文件")],
    upload_type: Annotated[UploadType, Form(alias="type")],
) -> UploadResponse:
    try:
        result = await service.upload(book_id, upload_type, file)
    except FileTooLargeError as error:
        raise _upload_error(
            status.HTTP_413_CONTENT_TOO_LARGE,
            "file_too_large",
            "File exceeds the 100 MB limit.",
            "文件超过 100 MB 限制。",
        ) from error
    except (UnsupportedFileFormatError, InvalidFileContentError) as error:
        raise _upload_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "unsupported_file_format",
            "Unsupported file format.",
            "不支持的文件格式。",
        ) from error
    if result is None:
        raise book_not_found()
    return result


@router.delete(
    "/{book_id}/upload/{upload_type}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a publication file / 删除出版文件",
)
def delete_book_file(
    book_id: int,
    upload_type: UploadType,
    service: UploadServiceDep,
) -> Response:
    if not service.delete(book_id, upload_type):
        raise book_not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


def _upload_error(
    status_code: int,
    code: str,
    message: str,
    message_zh: str,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={
            "code": code,
            "message": message,
            "message_zh": message_zh,
        },
    )
