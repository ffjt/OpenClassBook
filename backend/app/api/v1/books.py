from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)

from app.api.dependencies import (
    BookServiceDep,
    CurrentUserDep,
    InvitationServiceDep,
    OwnedBookDep,
    UploadServiceDep,
)
from app.core.rate_limit import enforce_rate_limit
from app.schemas.book import BookCreate, BookResponse, BookUpdate
from app.schemas.invitation import (
    InvitationCreate,
    InvitationResponse,
    InvitationUpdate,
)
from app.schemas.upload import UploadResponse, UploadType
from app.services.invitation import InvitationConfigurationError
from app.services.upload import (
    FileTooLargeError,
    InvalidFileContentError,
    ProtectedUploadError,
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


def invitation_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "invitation_not_found",
            "message": "Invitation not found.",
            "message_zh": "未找到该邀请。",
        },
    )


def invitation_configuration_error(
    error: InvitationConfigurationError,
) -> HTTPException:
    messages = {
        "empty_update": (
            "At least one invitation setting is required.",
            "至少需要修改一项邀请设置。",
        ),
        "expiration_in_past": (
            "The expiration date must be in the future.",
            "过期时间必须晚于当前时间。",
        ),
        "max_uses_below_used_count": (
            "Maximum uses cannot be lower than the current usage count.",
            "最大使用次数不能小于当前已使用次数。",
        ),
    }
    message, message_zh = messages[str(error)]
    return HTTPException(
        status_code=(
            status.HTTP_400_BAD_REQUEST
            if str(error) == "empty_update"
            else status.HTTP_422_UNPROCESSABLE_CONTENT
        ),
        detail={"code": str(error), "message": message, "message_zh": message_zh},
    )


@router.get(
    "",
    response_model=list[BookResponse],
    summary="List books / 获取书籍列表",
)
def list_books(
    service: BookServiceDep,
    user: CurrentUserDep,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[BookResponse]:
    return [
        BookResponse.model_validate(book)
        for book in service.list_for_owner(user.id, offset=offset, limit=limit)
    ]


@router.post(
    "",
    response_model=BookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a book / 创建书籍",
)
def create_book(
    data: BookCreate,
    service: BookServiceDep,
    user: CurrentUserDep,
) -> BookResponse:
    return BookResponse.model_validate(service.create(data, user.id))


@router.get(
    "/{book_id}/invitations",
    response_model=list[InvitationResponse],
    summary="List invitations / 获取邀请列表",
)
def list_invitations(
    book_id: int,
    service: InvitationServiceDep,
    _: OwnedBookDep,
) -> list[InvitationResponse]:
    return [
        InvitationResponse.model_validate(invitation)
        for invitation in service.list_for_book(book_id)
    ]


@router.post(
    "/{book_id}/invitations",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an invitation / 创建邀请",
)
def create_invitation(
    data: InvitationCreate,
    service: InvitationServiceDep,
    book: OwnedBookDep,
    user: CurrentUserDep,
) -> InvitationResponse:
    try:
        invitation = service.create(book, user.id, data)
    except InvitationConfigurationError as error:
        raise invitation_configuration_error(error) from error
    return InvitationResponse.model_validate(invitation)


@router.patch(
    "/{book_id}/invitations/{invitation_id}",
    response_model=InvitationResponse,
    summary="Update invitation limits / 更新邀请限制",
)
def update_invitation(
    book_id: int,
    invitation_id: int,
    data: InvitationUpdate,
    service: InvitationServiceDep,
    _: OwnedBookDep,
) -> InvitationResponse:
    try:
        invitation = service.update(book_id, invitation_id, data)
    except InvitationConfigurationError as error:
        raise invitation_configuration_error(error) from error
    if invitation is None:
        raise invitation_not_found()
    return InvitationResponse.model_validate(invitation)


@router.post(
    "/{book_id}/invitations/{invitation_id}/regenerate",
    response_model=InvitationResponse,
    summary="Regenerate invitation / 重新生成邀请",
)
def regenerate_invitation(
    invitation_id: int,
    service: InvitationServiceDep,
    book: OwnedBookDep,
) -> InvitationResponse:
    invitation = service.regenerate(book, invitation_id)
    if invitation is None:
        raise invitation_not_found()
    return InvitationResponse.model_validate(invitation)


@router.post(
    "/{book_id}/invitations/{invitation_id}/disable",
    response_model=InvitationResponse,
    summary="Disable invitation / 停用邀请",
)
def disable_invitation(
    book_id: int,
    invitation_id: int,
    service: InvitationServiceDep,
    _: OwnedBookDep,
) -> InvitationResponse:
    invitation = service.disable(book_id, invitation_id)
    if invitation is None:
        raise invitation_not_found()
    return InvitationResponse.model_validate(invitation)


@router.post(
    "/{book_id}/upload",
    response_model=UploadResponse,
    summary="Upload a publication file / 上传出版文件",
)
async def upload_book_file(
    book_id: int,
    request: Request,
    service: UploadServiceDep,
    _: OwnedBookDep,
    file: Annotated[UploadFile, File(description="File / 文件")],
    upload_type: Annotated[UploadType, Form(alias="type")],
) -> UploadResponse:
    enforce_rate_limit(request, "upload", maximum=20, window_seconds=900)
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
    _: OwnedBookDep,
) -> Response:
    try:
        if not service.delete(book_id, upload_type):
            raise book_not_found()
    except ProtectedUploadError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "protected_upload",
                "message": (
                    "Cover and back-cover files cannot be deleted. "
                    "Replace them instead."
                ),
                "message_zh": "封面和封底文件不可删除，请使用替换功能。",
            },
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{book_id}",
    response_model=BookResponse,
    summary="Get a book / 获取单本书籍",
)
def get_book(book: OwnedBookDep) -> BookResponse:
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
    _: OwnedBookDep,
) -> BookResponse:
    try:
        book = service.update(book_id, data)
    except ValueError as error:
        empty_update = str(error).startswith("At least one field")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                {
                    "code": "empty_update",
                    "message": "At least one field is required",
                    "message_zh": "至少需要一个更新字段",
                }
                if empty_update
                else {
                    "code": "invalid_numbering_configuration",
                    "message": "Number mode and article-number list are inconsistent",
                    "message_zh": "编号模式与文章编号列表不一致",
                }
            ),
        ) from error

    if book is None:
        raise book_not_found()
    return BookResponse.model_validate(book)


@router.delete(
    "/{book_id}/drafts",
    response_model=BookResponse,
    summary="Delete all book drafts / 删除书籍全部草稿",
)
def delete_book_drafts(
    book_id: int,
    service: BookServiceDep,
    _: OwnedBookDep,
) -> BookResponse:
    book = service.delete_drafts(book_id)
    if book is None:
        raise book_not_found()
    return BookResponse.model_validate(book)


@router.delete(
    "/{book_id}/articles",
    response_model=BookResponse,
    summary="Delete all book articles / 删除书籍全部文章",
)
def delete_book_articles(
    book_id: int,
    service: BookServiceDep,
    _: OwnedBookDep,
) -> BookResponse:
    book = service.delete_articles(book_id)
    if book is None:
        raise book_not_found()
    return BookResponse.model_validate(book)


@router.delete(
    "/{book_id}/authors",
    response_model=BookResponse,
    summary="Delete all book authors / 删除书籍全部作者",
)
def delete_book_authors(
    book_id: int,
    service: BookServiceDep,
    _: OwnedBookDep,
) -> BookResponse:
    book = service.delete_authors(book_id)
    if book is None:
        raise book_not_found()
    return BookResponse.model_validate(book)


@router.post(
    "/{book_id}/invite-code",
    response_model=BookResponse,
    summary="Regenerate invitation code / 重新生成邀请码",
)
def regenerate_invite_code(
    book_id: int,
    service: BookServiceDep,
    _: OwnedBookDep,
) -> BookResponse:
    book = service.regenerate_invite_code(book_id)
    if book is None:
        raise book_not_found()
    return BookResponse.model_validate(book)


@router.delete(
    "/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a book / 删除书籍",
)
def delete_book(
    book_id: int,
    service: BookServiceDep,
    _: OwnedBookDep,
) -> Response:
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
