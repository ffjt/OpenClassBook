from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

EmailAddress = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=3,
        max_length=254,
        pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
    ),
]
VerificationCode = Annotated[
    str, StringConstraints(strip_whitespace=True, pattern=r"^\d{6}$")
]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
Username = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]


class VerificationCodeRequest(BaseModel):
    email: EmailAddress

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class RegisterRequest(VerificationCodeRequest):
    code: VerificationCode
    password: Password
    username: Username


class LoginRequest(VerificationCodeRequest):
    password: Password


class RefreshRequest(BaseModel):
    refresh_token: Annotated[str, StringConstraints(min_length=1)]


class LogoutRequest(BaseModel):
    refresh_token: Annotated[str, StringConstraints(min_length=1)]


class VerificationCodeResponse(BaseModel):
    message: str
    message_zh: str
    retry_after_seconds: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    avatar: str | None
    created_at: datetime
    updated_at: datetime


class AuthenticationResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
