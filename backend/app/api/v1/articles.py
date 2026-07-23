from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import (
    ArticleServiceDep,
    AuthorizedArticleDep,
    AuthorizedAuthorDep,
    AuthorizedBookDep,
    CurrentActorDep,
    OwnedArticleDep,
    OwnedBookDep,
)
from app.schemas.article import (
    ArticleCreate,
    ArticleEditRequestDecision,
    ArticleNumberAssignment,
    ArticleOrderAssignment,
    ArticleResponse,
    ArticleStatusUpdate,
    ArticleUpdate,
)
from app.services.auth import AuthorPrincipal

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
    _: AuthorizedAuthorDep,
) -> list[ArticleResponse]:
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
    _: OwnedBookDep,
    include_drafts: bool = True,
) -> list[ArticleResponse]:
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
    _: OwnedBookDep,
) -> list[ArticleResponse]:
    try:
        articles = service.assign_numbers(book_id, data)
    except LookupError:
        raise book_not_found() from None
    except ValueError as error:
        if str(error) == "layout_numbering_required":
            detail = {
                "message": (
                    "Layout numbering is only available in automatic-numbering mode"
                ),
                "message_zh": "只有自动生成编号模式才能在排版时统一添加编号",
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
    _: OwnedBookDep,
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
    actor: CurrentActorDep,
    _: AuthorizedBookDep,
) -> ArticleResponse:
    if isinstance(actor, AuthorPrincipal) and actor.author_id != data.author_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Author not found", "message_zh": "未找到作者"},
        )
    if not service.author_belongs_to_book(data.author_id, book_id):
        raise author_not_in_book()
    try:
        article = service.create(book_id, data)
    except ValueError as error:
        error_code = str(error)
        if error_code in {
            "submission_disabled",
            "submission_deadline_passed",
            "article_limit_reached",
        }:
            messages = {
                "submission_disabled": (
                    "This book is not accepting submissions",
                    "当前书籍已停止接收投稿",
                ),
                "submission_deadline_passed": (
                    "The submission deadline has passed",
                    "投稿截止时间已过",
                ),
                "article_limit_reached": (
                    "This author has reached the article limit",
                    "该作者已达到投稿数量上限",
                ),
            }
            message, message_zh = messages[error_code]
            detail = {"code": error_code, "message": message, "message_zh": message_zh}
        elif error_code == "article_number_required":
            detail = {
                "code": error_code,
                "message": "Claim an article number before creating the article",
                "message_zh": "创建文章前请先认领编号",
            }
        elif error_code == "article_number_not_available":
            detail = {
                "code": error_code,
                "message": "Choose a number within this book's configured claim range",
                "message_zh": "请选择本书已设置认领范围内的编号",
            }
        else:
            detail = {
                "code": "article_number_already_claimed",
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
def get_article(article: AuthorizedArticleDep) -> ArticleResponse:
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
    actor: CurrentActorDep,
    current: AuthorizedArticleDep,
) -> ArticleResponse:
    if (
        isinstance(actor, AuthorPrincipal)
        and data.author_id is not None
        and data.author_id != current.author_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Article not found", "message_zh": "未找到文章"},
        )
    if data.author_id is not None and not service.author_belongs_to_book(
        data.author_id,
        current.book_id,
    ):
        raise author_not_in_book()

    try:
        article = service.update(article_id, data)
    except ValueError as error:
        error_code = str(error)
        if error_code in {
            "submission_disabled",
            "submission_deadline_passed",
            "article_submission_locked",
            "article_reviewed_locked",
        }:
            messages = {
                "submission_disabled": (
                    "This book is not accepting changes",
                    "当前书籍已停止接收修改",
                ),
                "submission_deadline_passed": (
                    "The submission deadline has passed",
                    "投稿截止时间已过，不能继续修改",
                ),
                "article_submission_locked": (
                    "This article was locked when it was submitted",
                    "该文章已在提交后锁定",
                ),
                "article_reviewed_locked": (
                    "Reviewed articles cannot be changed by authors",
                    "已审核文章不能由作者继续修改",
                ),
            }
            message, message_zh = messages[error_code]
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": error_code,
                    "message": message,
                    "message_zh": message_zh,
                },
            ) from error
        if error_code.startswith("article_number_"):
            detail = {
                "code": error_code,
                "message": (
                    "Choose a number within this book's configured claim range"
                    if error_code == "article_number_not_available"
                    else "This article number has already been claimed"
                ),
                "message_zh": (
                    "请选择本书已设置认领范围内的编号"
                    if error_code == "article_number_not_available"
                    else "这个文章编号已被认领"
                ),
            }
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=detail,
            ) from error
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
def delete_article(
    article_id: int,
    service: ArticleServiceDep,
    _: AuthorizedArticleDep,
) -> Response:
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
    _: OwnedArticleDep,
) -> ArticleResponse:
    article = service.update_status(article_id, data)
    if article is None:
        raise article_not_found()
    return ArticleResponse.model_validate(article)


@router.post(
    "/articles/{article_id}/edit-request",
    response_model=ArticleResponse,
    summary="Request changes to an approved article / 申请修改已通过文章",
)
def request_article_edit(
    article_id: int,
    service: ArticleServiceDep,
    _: AuthorizedArticleDep,
) -> ArticleResponse:
    try:
        article = service.request_edit(article_id)
    except ValueError as error:
        error_code = str(error)
        messages = {
            "article_edit_request_unavailable": (
                "Only approved articles can request changes",
                "只有已通过审核的文章可以申请修改",
            ),
            "article_edit_request_pending": (
                "A change request is already pending",
                "该文章已有待处理的修改申请",
            ),
        }
        message, message_zh = messages[error_code]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": error_code,
                "message": message,
                "message_zh": message_zh,
            },
        ) from error
    if article is None:
        raise article_not_found()
    return ArticleResponse.model_validate(article)


@router.patch(
    "/articles/{article_id}/edit-request",
    response_model=ArticleResponse,
    summary="Resolve an article change request / 处理文章修改申请",
)
def resolve_article_edit_request(
    article_id: int,
    data: ArticleEditRequestDecision,
    service: ArticleServiceDep,
    _: OwnedArticleDep,
) -> ArticleResponse:
    try:
        article = service.resolve_edit_request(article_id, data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "article_edit_request_not_found",
                "message": "This article has no pending change request",
                "message_zh": "该文章没有待处理的修改申请",
            },
        ) from error
    if article is None:
        raise article_not_found()
    return ArticleResponse.model_validate(article)
