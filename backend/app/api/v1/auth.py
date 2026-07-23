from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import AuthServiceDep, CurrentUserDep
from app.email_provider import EmailProviderError
from app.repositories.auth import DuplicateEmailError
from app.schemas.auth import (
    AuthenticationResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    UserResponse,
    VerificationCodeRequest,
    VerificationCodeResponse,
)
from app.services.auth import (
    AuthenticationError,
)
from app.services.verification import VerificationCodeError, VerificationRateLimitError

router = APIRouter(prefix="/auth", tags=["Authentication / 账号认证"])


@router.post(
    "/verification-code",
    response_model=VerificationCodeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Send a registration verification code / 发送注册验证码",
)
def send_verification_code(
    data: VerificationCodeRequest, service: AuthServiceDep
) -> VerificationCodeResponse:
    try:
        retry_after_seconds = service.send_verification_code(data.email)
    except VerificationRateLimitError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "verification_rate_limited",
                "message": "Please wait before requesting another verification code.",
                "message_zh": "请稍后再请求新的验证码。",
            },
            headers={"Retry-After": str(error.retry_after_seconds)},
        ) from error
    except EmailProviderError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "email_provider_unavailable",
                "message": "Email verification is temporarily unavailable.",
                "message_zh": "邮件验证码服务暂时不可用。",
            },
        ) from error
    return VerificationCodeResponse(
        message="Verification code sent.",
        message_zh="验证码已发送。",
        retry_after_seconds=retry_after_seconds,
    )


@router.post(
    "/register",
    response_model=AuthenticationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a book-owner account / 注册书籍管理账号",
)
def register(data: RegisterRequest, service: AuthServiceDep) -> AuthenticationResponse:
    try:
        return AuthenticationResponse.model_validate(service.register(data))
    except DuplicateEmailError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "email_already_registered",
                "message": "An account already exists for this email.",
                "message_zh": "此邮箱已经注册过账号。",
            },
        ) from error
    except VerificationCodeError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_verification_code",
                "message": "The verification code is invalid or expired.",
                "message_zh": "验证码无效或已过期。",
            },
        ) from error


@router.post(
    "/login",
    response_model=AuthenticationResponse,
    summary="Sign in with email and password / 使用邮箱和密码登录",
)
def login(data: LoginRequest, service: AuthServiceDep) -> AuthenticationResponse:
    try:
        return AuthenticationResponse.model_validate(service.login(data))
    except AuthenticationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_credentials",
                "message": "Invalid email or password.",
                "message_zh": "邮箱或密码不正确。",
            },
            headers={"WWW-Authenticate": "Bearer"},
        ) from error


@router.post(
    "/refresh",
    response_model=AuthenticationResponse,
    summary="Refresh an owner session / 刷新登录会话",
)
def refresh(data: RefreshRequest, service: AuthServiceDep) -> AuthenticationResponse:
    try:
        return AuthenticationResponse.model_validate(
            service.refresh(data.refresh_token)
        )
    except AuthenticationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "invalid_refresh_token",
                "message": "Your sign-in has expired. Please sign in again.",
                "message_zh": "登录状态已过期，请重新登录。",
            },
        ) from error


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current user / 获取当前用户",
)
def get_current_user(user: CurrentUserDep) -> UserResponse:
    return UserResponse.model_validate(user)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sign out an owner session / 退出登录",
)
def logout(data: LogoutRequest, service: AuthServiceDep) -> Response:
    try:
        service.logout(data.refresh_token)
    except AuthenticationError:
        pass
    return Response(status_code=status.HTTP_204_NO_CONTENT)
