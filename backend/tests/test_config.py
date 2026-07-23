import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_requires_a_configured_email_provider() -> None:
    with pytest.raises(ValidationError, match="AUTH_EMAIL_PROVIDER"):
        Settings(
            app_environment="production",
            auth_jwt_secret="x" * 32,
            cors_origins=["https://app.example.com"],
        )


def test_production_accepts_complete_smtp_settings() -> None:
    settings = Settings(
        app_environment="production",
        auth_jwt_secret="x" * 32,
        auth_email_provider="smtp",
        auth_smtp_host="smtp.example.com",
        auth_smtp_from_email="mailer@example.com",
        cors_origins=["https://app.example.com"],
    )

    assert settings.cors_origin_regex is None
