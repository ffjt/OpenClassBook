from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "OpenClassBook Backend API"
    app_description: str = "OpenClassBook 后端 API / OpenClassBook Backend API"
    app_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./openclassbook.db"
    export_dir: Path = Path("generated/exports")
    storage_dir: Path = BACKEND_ROOT / "storage"
    max_upload_size: int = 100 * 1024 * 1024
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    cors_origin_regex: str = (
        r"^https?://(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
