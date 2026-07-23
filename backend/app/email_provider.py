import json
import smtplib
from abc import ABC, abstractmethod
from datetime import datetime
from email.message import EmailMessage

from app.core.config import Settings, settings


class EmailProviderError(RuntimeError):
    """Raised when a configured email provider cannot deliver a message."""


class EmailProvider(ABC):
    @abstractmethod
    def send_verification_code(
        self, email: str, code: str, expires_at: datetime
    ) -> None:
        """Deliver one registration verification code."""


class UnconfiguredEmailProvider(EmailProvider):
    def send_verification_code(
        self, email: str, code: str, expires_at: datetime
    ) -> None:
        raise EmailProviderError(
            "Email verification is not configured. "
            "Set AUTH_EMAIL_PROVIDER and its provider settings."
        )


class SmtpEmailProvider(EmailProvider):
    def __init__(self, config: Settings) -> None:
        if not all((config.auth_smtp_host, config.auth_smtp_from_email)):
            raise EmailProviderError("SMTP settings are incomplete.")
        self.host = config.auth_smtp_host
        self.port = config.auth_smtp_port
        self.username = config.auth_smtp_username
        self.password = config.auth_smtp_password
        self.from_email = config.auth_smtp_from_email

    def send_verification_code(
        self, email: str, code: str, expires_at: datetime
    ) -> None:
        message = EmailMessage()
        message["Subject"] = "Your OpenClassBook verification code"
        message["From"] = self.from_email
        message["To"] = email
        message.set_content(
            "Your OpenClassBook verification code is "
            f"{code}. It expires at {expires_at.isoformat()}."
        )
        try:
            with smtplib.SMTP(self.host, self.port, timeout=10) as client:
                client.starttls()
                if self.username and self.password:
                    client.login(self.username, self.password)
                client.send_message(message)
        except (OSError, smtplib.SMTPException) as error:
            raise EmailProviderError(
                "SMTP could not send the verification email."
            ) from error


class TencentSesEmailProvider(EmailProvider):
    """Tencent Cloud SES adapter for transactional verification emails."""

    def __init__(self, config: Settings) -> None:
        if not all(
            (
                config.auth_tencent_ses_from_email,
                config.auth_tencent_ses_template_id,
            )
        ):
            raise EmailProviderError("Tencent Cloud SES settings are incomplete.")
        self.region = config.auth_tencent_ses_region
        self.from_email = config.auth_tencent_ses_from_email
        self.template_id = config.auth_tencent_ses_template_id

    def send_verification_code(
        self, email: str, code: str, expires_at: datetime
    ) -> None:
        try:
            from tencentcloud.common import credential
            from tencentcloud.ses.v20201002 import models, ses_client
        except ImportError as error:
            raise EmailProviderError(
                "Tencent Cloud SES SDK is not installed."
            ) from error

        try:
            request = models.SendEmailRequest()
            request.FromEmailAddress = self.from_email
            request.Destination = [email]
            request.Subject = "OpenClassBook verification code"
            request.Template = models.Template()
            request.Template.TemplateID = self.template_id
            request.Template.TemplateData = json.dumps(
                {
                    "code": code,
                    "expiresAt": expires_at.isoformat(),
                }
            )
            ses_client.SesClient(
                credential.EnvironmentVariableCredential(), self.region
            ).SendEmail(request)
        except Exception as error:
            raise EmailProviderError(
                "Tencent Cloud SES could not send the verification email."
            ) from error


def get_email_provider(config: Settings = settings) -> EmailProvider:
    provider = config.auth_email_provider.lower()
    if provider == "smtp":
        return SmtpEmailProvider(config)
    if provider == "tencent_ses":
        return TencentSesEmailProvider(config)
    return UnconfiguredEmailProvider()
