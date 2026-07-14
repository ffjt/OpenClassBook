from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.database import init_db
from app.schemas.common import HealthResponse, MessageResponse


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/", response_model=MessageResponse, tags=["System / 系统"])
def root() -> MessageResponse:
    return MessageResponse(
        message="OpenClassBook Backend API",
        message_zh="OpenClassBook 后端 API",
    )


@app.get("/health", response_model=HealthResponse, tags=["System / 系统"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", status_zh="正常")
