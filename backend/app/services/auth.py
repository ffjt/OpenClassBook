import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import Settings
from app.models.user import User
from app.repositories.auth import AuthRepository, DuplicateEmailError
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.verification import EmailVerificationService


class AuthenticationError(ValueError):
    pass


class AuthService:
    def __init__(
        self,
        repository: AuthRepository,
        verification_service: EmailVerificationService,
        config: Settings,
    ) -> None:
        self.repository = repository
        self.verification_service = verification_service
        self.config = config
        self.password_hasher = PasswordHash.recommended()

    def send_verification_code(self, email: str) -> int:
        return self.verification_service.send_verification_code(email)

    def register(self, data: RegisterRequest) -> dict[str, object]:
        if self.repository.get_user_by_email(data.email) is not None:
            raise DuplicateEmailError(data.email)
        now = datetime.now(UTC)
        verification = self.verification_service.verify_code(data.email, data.code)
        user = self.repository.create_user_with_workspace(
            email=data.email,
            username=data.username,
            password_hash=self.password_hasher.hash(data.password),
            verification=verification,
            now=now,
        )
        return self._authentication_response(user)

    def login(self, data: LoginRequest) -> dict[str, object]:
        user = self.repository.get_user_by_email(data.email)
        if user is None or not self.password_hasher.verify(
            data.password, user.password_hash
        ):
            raise AuthenticationError("Invalid email or password.")
        return self._authentication_response(user)

    def refresh(self, refresh_token: str) -> dict[str, object]:
        claims = self._decode_token(refresh_token, expected_type="refresh")
        stored_token = self.repository.get_refresh_token(
            self._token_hash(refresh_token)
        )
        now = datetime.now(UTC)
        if (
            stored_token is None
            or stored_token.revoked_at is not None
            or self._as_utc(stored_token.expires_at) < now
            or stored_token.user_id != int(claims["sub"])
        ):
            raise AuthenticationError("Refresh token is invalid.")
        user = self.repository.get_user(stored_token.user_id)
        if user is None:
            raise AuthenticationError("Refresh token is invalid.")
        self.repository.revoke_refresh_token(stored_token, now)
        return self._authentication_response(user)

    def logout(self, refresh_token: str) -> None:
        self._decode_token(refresh_token, expected_type="refresh")
        stored_token = self.repository.get_refresh_token(
            self._token_hash(refresh_token)
        )
        if stored_token is not None and stored_token.revoked_at is None:
            self.repository.revoke_refresh_token(stored_token, datetime.now(UTC))

    def current_user(self, access_token: str) -> User:
        claims = self._decode_token(access_token, expected_type="access")
        user = self.repository.get_user(int(claims["sub"]))
        if user is None:
            raise AuthenticationError("Authentication is invalid.")
        return user

    def _authentication_response(self, user: User) -> dict[str, object]:
        now = datetime.now(UTC)
        access_token = self._create_token(
            user.id,
            "access",
            now,
            self.config.auth_access_token_minutes,
        )
        refresh_token = self._create_token(
            user.id,
            "refresh",
            now,
            self.config.auth_refresh_token_days * 24 * 60,
        )
        self.repository.create_refresh_token(
            user_id=user.id,
            token_hash=self._token_hash(refresh_token),
            expires_at=now + timedelta(days=self.config.auth_refresh_token_days),
            created_at=now,
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user,
        }

    def _create_token(
        self, user_id: int, token_type: str, now: datetime, lifetime_minutes: int
    ) -> str:
        return jwt.encode(
            {
                "sub": str(user_id),
                "type": token_type,
                "jti": secrets.token_urlsafe(18),
                "iat": now,
                "exp": now + timedelta(minutes=lifetime_minutes),
            },
            self.config.auth_jwt_secret,
            algorithm="HS256",
        )

    def _decode_token(self, token: str, *, expected_type: str) -> dict[str, object]:
        try:
            claims = jwt.decode(
                token,
                self.config.auth_jwt_secret,
                algorithms=["HS256"],
                options={"require": ["sub", "type", "jti", "exp"]},
            )
        except InvalidTokenError as error:
            raise AuthenticationError("Authentication token is invalid.") from error
        if claims.get("type") != expected_type:
            raise AuthenticationError("Authentication token is invalid.")
        return claims

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        return (
            value.replace(tzinfo=UTC)
            if value.tzinfo is None
            else value.astimezone(UTC)
        )
