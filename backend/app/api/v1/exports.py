from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.api.dependencies import ExportServiceDep
from app.schemas.export import ExportPreviewResponse, ExportResponse
from app.services.export import NoPublishableContentError, SourceFileError

router = APIRouter(tags=["Export / 导出"])


def book_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"message": "Book not found", "message_zh": "未找到书籍"},
    )


@router.get(
    "/books/{book_id}/export",
    response_model=ExportPreviewResponse,
    summary="Get export preview data / 获取导出预览数据",
)
def get_export_preview(
    book_id: int,
    service: ExportServiceDep,
    preflight: bool = True,
) -> ExportPreviewResponse:
    preview = service.get_preview(book_id, preflight_assets=preflight)
    if preview is None:
        raise book_not_found()
    return preview


@router.post(
    "/books/{book_id}/export",
    response_model=ExportResponse,
    summary="Generate the book PDF / 生成整本书 PDF",
)
def generate_export(book_id: int, service: ExportServiceDep) -> ExportResponse:
    try:
        result = service.generate(book_id, f"/api/v1/books/{book_id}/export")
    except NoPublishableContentError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "no_publishable_content",
                "message": "There is no publishable content.",
                "message_zh": "暂无可出版内容。",
            },
        ) from error
    except SourceFileError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": "source_file_unreadable",
                "message": (
                    f"{error.label_en} file cannot be parsed. Replace it before export."
                ),
                "message_zh": f"{error.label_zh}文件无法解析，请替换后再导出。",
            },
        ) from error
    if result is None:
        raise book_not_found()
    return result


@router.post(
    "/books/{book_id}/appearance-export",
    response_model=ExportResponse,
    summary="Generate the exterior cover spread PDF / 生成封面展开图 PDF",
)
def generate_appearance_export(
    book_id: int, service: ExportServiceDep
) -> ExportResponse:
    result = service.generate_appearance(
        book_id, f"/api/v1/books/{book_id}/appearance-export"
    )
    if result is None:
        raise book_not_found()
    return result


@router.get(
    "/books/{book_id}/appearance-export/{task_id}/download",
    response_class=FileResponse,
    summary="Download the exterior cover spread PDF / 下载封面展开图 PDF",
)
def download_appearance_export(
    book_id: int, task_id: str, service: ExportServiceDep
) -> FileResponse:
    artifact = service.get_appearance_artifact(book_id, task_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Appearance PDF not found",
                "message_zh": "未找到封面展开图 PDF",
            },
        )
    return FileResponse(
        path=Path(artifact),
        media_type="application/pdf",
        filename=f"openclassbook-{book_id}-cover-spread.pdf",
    )


@router.get(
    "/books/{book_id}/export/{task_id}/download",
    response_class=FileResponse,
    summary="Download a generated PDF / 下载已生成的 PDF",
)
def download_export(
    book_id: int,
    task_id: str,
    service: ExportServiceDep,
) -> FileResponse:
    artifact = service.get_artifact(book_id, task_id)
    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Generated PDF not found",
                "message_zh": "未找到已生成的 PDF",
            },
        )
    return FileResponse(
        path=Path(artifact),
        media_type="application/pdf",
        filename=f"openclassbook-{book_id}.pdf",
    )
