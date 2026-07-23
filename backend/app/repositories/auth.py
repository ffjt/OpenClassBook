from datetime import datetime

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import EmailVerificationCode, RefreshToken, User, Workspace


class DuplicateEmailError(ValueError):
    pass


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user_by_email(self, email: str) -> User | None:
        return self.session.scalar(select(User).where(User.email == email))

    def get_user(self, user_id: int) -> User | None:
        return self.session.get(User, user_id)

    def get_latest_verification_code(self, email: str) -> EmailVerificationCode | None:
        return self.session.scalar(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.email == email,
                EmailVerificationCode.consumed_at.is_(None),
            )
            .order_by(desc(EmailVerificationCode.created_at))
        )

    def create_verification_code(
        self,
        *,
        email: str,
        code_hash: str,
        expires_at: datetime,
        created_at: datetime,
    ) -> EmailVerificationCode:
        record = EmailVerificationCode(
            email=email,
            code_hash=code_hash,
            expires_at=expires_at,
            created_at=created_at,
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def create_user_with_workspace(
        self,
        *,
        email: str,
        username: str,
        password_hash: str,
        verification: EmailVerificationCode,
        now: datetime,
    ) -> User:
        user = User(
            email=email,
            username=username,
            password_hash=password_hash,
            created_at=now,
            updated_at=now,
        )
        self.session.add(user)
        self.session.flush()
        self.session.add(
            Workspace(
                name=f"{username}'s Workspace",
                owner_id=user.id,
                created_at=now,
            )
        )
        verification.consumed_at = now
        try:
            self.session.commit()
        except IntegrityError as error:
            self.session.rollback()
            raise DuplicateEmailError(email) from error
        self.session.refresh(user)
        return user

    def create_refresh_token(
        self,
        *,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
        created_at: datetime,
    ) -> None:
        self.session.add(
            RefreshToken(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at,
                created_at=created_at,
            )
        )
        self.session.commit()

    def get_refresh_token(self, token_hash: str) -> RefreshToken | None:
        return self.session.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )

    def revoke_refresh_token(self, token: RefreshToken, now: datetime) -> None:
        token.revoked_at = now
        self.session.commit()
