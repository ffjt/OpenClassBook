from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import JoinServiceDep
from app.schemas.book import BookResponse
from app.schemas.invitation import JoinBookResponse, JoinCreate, JoinResponse
from app.services.join import JoinUnavailableError

router = APIRouter(prefix="/join", tags=["Join / 加入书籍"])


def invitation_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "message": "Invitation not found or expired",
            "message_zh": "邀请已失效或不存在",
        },
    )


def join_unavailable(error: JoinUnavailableError) -> HTTPException:
    if error.code == "invite_disabled":
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": error.code,
                "message": "This book is not accepting new authors.",
                "message_zh": "当前书籍暂不接受新的作者加入。",
            },
        )
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": error.code,
            "message": "This book has stopped accepting submissions.",
            "message_zh": "当前书籍已停止接收投稿。",
        },
    )


@router.get(
    "/{invite_code}",
    response_model=JoinBookResponse,
    summary="Read an invitation / 读取邀请信息",
)
def get_join(invite_code: str, service: JoinServiceDep) -> JoinBookResponse:
    try:
        book = service.get_book(invite_code)
    except JoinUnavailableError as error:
        raise join_unavailable(error) from error
    if book is None:
        raise invitation_not_found()
    return JoinBookResponse(book=BookResponse.model_validate(book))


@router.post(
    "/{invite_code}",
    response_model=JoinResponse,
    summary="Join a book / 加入一本书",
)
def join_book(
    invite_code: str,
    data: JoinCreate,
    service: JoinServiceDep,
) -> JoinResponse:
    try:
        result = service.join(invite_code, data)
    except JoinUnavailableError as error:
        raise join_unavailable(error) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": "class_value_required",
                "message": "A valid class value is required.",
                "message_zh": "请按班级格式填写内容。",
            },
        ) from error
    if result is None:
        raise invitation_not_found()
    mode, author = result
    return JoinResponse(mode=mode, author_id=author.id if author else None)
