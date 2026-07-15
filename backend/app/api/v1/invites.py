from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import InviteServiceDep
from app.schemas.invitation import InviteResponse

router = APIRouter(tags=["Invitations / 邀请"])


@router.get(
    "/books/{book_id}/invite",
    response_model=InviteResponse,
    summary="Get book invitation / 获取书籍邀请信息",
)
def get_invite(book_id: int, service: InviteServiceDep) -> InviteResponse:
    book = service.get_book(book_id)
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Book not found", "message_zh": "未找到书籍"},
        )
    return InviteResponse(
        book_id=book.id,
        title=book.title,
        owner_name=book.owner_name,
        invite_code=book.invite_code,
    )
