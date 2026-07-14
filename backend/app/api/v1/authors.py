from fastapi import APIRouter

from app.api.dependencies import AuthorServiceDep
from app.schemas.author import AuthorCreate, AuthorResponse, AuthorUpdate
from app.schemas.common import MessageResponse

router = APIRouter(tags=["Authors / 作者"])


@router.get("/books/{book_id}/authors", response_model=list[AuthorResponse])
def list_authors(book_id: int, service: AuthorServiceDep) -> list[AuthorResponse]:
    return [
        AuthorResponse.model_validate(author)
        for author in service.list_by_book(book_id)
    ]


@router.post("/books/{book_id}/authors", response_model=MessageResponse)
def create_author(
    book_id: int,
    _data: AuthorCreate,
    service: AuthorServiceDep,
) -> MessageResponse:
    return service.not_implemented()


@router.patch("/authors/{author_id}", response_model=MessageResponse)
def update_author(
    author_id: int,
    _data: AuthorUpdate,
    service: AuthorServiceDep,
) -> MessageResponse:
    return service.not_implemented()
