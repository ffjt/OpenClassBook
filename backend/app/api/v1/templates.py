from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import TemplateServiceDep
from app.schemas.template import TemplateResponse, TemplateUpdate

router = APIRouter(tags=["Templates / 模板"])


@router.get("/books/{book_id}/template", response_model=TemplateResponse)
def get_template(book_id: int, service: TemplateServiceDep) -> TemplateResponse:
    template = service.get_by_book(book_id)
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Template not configured",
                "message_zh": "出版模板尚未配置",
            },
        )
    return TemplateResponse.model_validate(template)


@router.patch(
    "/books/{book_id}/template",
    response_model=TemplateResponse,
    summary="Save a book template / 保存书籍模板",
)
def update_template(
    book_id: int,
    data: TemplateUpdate,
    service: TemplateServiceDep,
) -> TemplateResponse:
    template = service.save_by_book(book_id, data)
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Book not found", "message_zh": "未找到书籍"},
        )
    return TemplateResponse.model_validate(template)
