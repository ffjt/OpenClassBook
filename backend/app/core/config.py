import secrets
from pathlib import Path
from typing import Literal

from pydantic import model_validator
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
    app_environment: Literal["development", "test", "production"] = "development"
    debug: bool = False
    auth_jwt_secret: str | None = None
    auth_access_token_minutes: int = 15
    auth_refresh_token_days: int = 30
    auth_author_token_days: int = 30
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
    tencentcloud_secret_id: str | None = None
    tencentcloud_secret_key: str | None = None
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    cors_origin_regex: str | None = (
        r"^https?://(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if self.app_environment == "production":
            if not self.auth_jwt_secret or len(self.auth_jwt_secret) < 32:
                raise ValueError(
                    "AUTH_JWT_SECRET must be at least 32 characters in production."
                )
            if self.debug:
                raise ValueError("DEBUG must be disabled in production.")
            if not self.cors_origins or any(
                "localhost" in origin or "127.0.0.1" in origin
                for origin in self.cors_origins
            ):
                raise ValueError(
                    "CORS_ORIGINS must contain explicit non-local production origins."
                )
            provider = self.auth_email_provider.lower()
            if provider == "smtp":
                if not all((self.auth_smtp_host, self.auth_smtp_from_email)):
                    raise ValueError(
                        "SMTP settings must be configured in production."
                    )
            elif provider == "tencent_ses":
                if not all(
                    (
                        self.auth_tencent_ses_from_email,
                        self.auth_tencent_ses_template_id,
                        self.tencentcloud_secret_id,
                        self.tencentcloud_secret_key,
                    )
                ):
                    raise ValueError(
                        "Tencent SES settings must be configured in production."
                    )
            else:
                raise ValueError(
                    "AUTH_EMAIL_PROVIDER must be smtp or tencent_ses in production."
                )
            # Development LAN matching is unsafe for a public deployment.
            self.cors_origin_regex = None
        elif not self.auth_jwt_secret:
            self.auth_jwt_secret = secrets.token_urlsafe(48)
        return self

    @property
    def is_production(self) -> bool:
        return self.app_environment == "production"


settings = Settings()
