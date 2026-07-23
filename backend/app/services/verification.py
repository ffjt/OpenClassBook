import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from app.core.config import Settings
from app.email_provider import EmailProvider
from app.models.user import EmailVerificationCode
from app.repositories.auth import AuthRepository


class VerificationCodeError(ValueError):
    pass


class VerificationRateLimitError(ValueError):
    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__("Verification code request is rate limited.")


class EmailVerificationService:
    """Owns verification-code state while providers only deliver the message."""

    def __init__(
        self,
        repository: AuthRepository,
        email_provider: EmailProvider,
        config: Settings,
    ) -> None:
        self.repository = repository
        self.email_provider = email_provider
        self.config = config

    def send_verification_code(self, email: str) -> int:
        now = datetime.now(UTC)
        latest = self.repository.get_latest_verification_code(email)
        if latest is not None:
            elapsed = (now - self._as_utc(latest.created_at)).total_seconds()
            remaining = self.config.verification_code_interval_seconds - int(elapsed)
            if remaining > 0:
                raise VerificationRateLimitError(remaining)

        code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = now + timedelta(minutes=self.config.verification_code_minutes)
        self.email_provider.send_verification_code(email, code, expires_at)
        self.repository.create_verification_code(
            email=email,
            code_hash=self._code_hash(email, code),
            expires_at=expires_at,
            created_at=now,
        )
        return self.config.verification_code_interval_seconds

    def verify_code(self, email: str, code: str) -> EmailVerificationCode:
        now = datetime.now(UTC)
        verification = self.repository.get_latest_verification_code(email)
        if (
            verification is None
            or verification.locked_at is not None
            or self._as_utc(verification.expires_at) < now
        ):
            raise VerificationCodeError("The verification code is invalid or expired.")
        if not hmac.compare_digest(
            verification.code_hash,
            self._code_hash(email, code),
        ):
            self.repository.record_verification_failure(
                verification,
                now,
                maximum_attempts=5,
            )
            raise VerificationCodeError("The verification code is invalid or expired.")
        return verification

    def _code_hash(self, email: str, code: str) -> str:
        return hmac.new(
            self.config.auth_jwt_secret.encode(),
            f"{email}:{code}".encode(),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        return (
            value.replace(tzinfo=UTC)
            if value.tzinfo is None
            else value.astimezone(UTC)
        )
