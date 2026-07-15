from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.api.dependencies import UploadServiceDep
from app.schemas.upload import UploadType

router = APIRouter(prefix="/files", tags=["Files / 文件"])


def file_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "message": "File not found",
            "message_zh": "未找到文件",
        },
    )


def _file_response(
    book_id: int,
    upload_type: UploadType,
    service: UploadServiceDep,
) -> FileResponse:
    result = service.get_file(book_id, upload_type)
    if result is None:
        raise file_not_found()
    path, relative_path, media_type = result
    return FileResponse(
        path,
        filename=path.name,
        media_type=media_type,
        content_disposition_type="inline",
        headers={"X-File-Path": relative_path},
    )


@router.get(
    "/{book_id}/{upload_type}",
    response_class=FileResponse,
    summary="Preview or download a file / 预览或下载文件",
)
def get_file(
    book_id: int,
    upload_type: UploadType,
    service: UploadServiceDep,
) -> FileResponse:
    return _file_response(book_id, upload_type, service)


@router.head(
    "/{book_id}/{upload_type}",
    response_class=FileResponse,
    include_in_schema=False,
)
def get_file_metadata(
    book_id: int,
    upload_type: UploadType,
    service: UploadServiceDep,
) -> FileResponse:
    return _file_response(book_id, upload_type, service)
