from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import JoinServiceDep
from app.schemas.book import BookResponse
from app.schemas.invitation import JoinBookResponse, JoinCreate, JoinResponse

router = APIRouter(prefix="/join", tags=["Join / 加入书籍"])


def invitation_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "message": "Invitation not found or expired",
            "message_zh": "邀请已失效或不存在",
        },
    )


@router.get(
    "/{invite_code}",
    response_model=JoinBookResponse,
    summary="Read an invitation / 读取邀请信息",
)
def get_join(invite_code: str, service: JoinServiceDep) -> JoinBookResponse:
    book = service.get_book(invite_code)
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
    result = service.join(invite_code, data)
    if result is None:
        raise invitation_not_found()
    mode, author = result
    return JoinResponse(mode=mode, author_id=author.id if author else None)
