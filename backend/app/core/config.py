import secrets
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
    auth_jwt_secret: str = secrets.token_urlsafe(48)
    auth_access_token_minutes: int = 15
    auth_refresh_token_days: int = 30
    verification_code_minutes: int = 10
    verification_code_interval_seconds: int = 60
    auth_email_provider: str = "unconfigured"
    auth_smtp_host: str | None = None
    auth_smtp_port: int = 587
    auth_smtp_username: str | None = None
    auth_smtp_password: str | None = None
    auth_smtp_from_email: str | None = None
    auth_tencent_ses_region: str = "ap-guangzhou"
    auth_tencent_ses_from_email: str | None = None
    auth_tencent_ses_template_id: int | None = None
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
