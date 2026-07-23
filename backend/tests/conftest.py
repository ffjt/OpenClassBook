import secrets
from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_db
from app.core.config import settings
from app.db.database import Base
from app.main import app
from app.models.user import RefreshToken, User


@pytest.fixture
def test_session_factory() -> Generator[sessionmaker[Session], None, None]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    factory = sessionmaker(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield factory
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture
def client(
    test_session_factory: sessionmaker[Session],
) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        now = datetime.now(UTC)
        with test_session_factory() as session:
            owner = User(
                email="test-owner@openclassbook.test",
                username="Test Owner",
                password_hash="not-used-in-api-tests",
                created_at=now,
                updated_at=now,
            )
            session.add(owner)
            session.flush()
            session_id = secrets.token_urlsafe(24)
            session.add(
                RefreshToken(
                    user_id=owner.id,
                    session_id=session_id,
                    token_hash=secrets.token_hex(32),
                    expires_at=now + timedelta(days=30),
                    created_at=now,
                )
            )
            session.commit()
            session.refresh(owner)
            access_token = jwt.encode(
                {
                    "sub": str(owner.id),
                    "type": "access",
                    "jti": secrets.token_urlsafe(18),
                    "sid": session_id,
                    "iat": now,
                    "exp": now + timedelta(minutes=15),
                },
                settings.auth_jwt_secret,
                algorithm="HS256",
            )
        test_client.headers["Authorization"] = f"Bearer {access_token}"
        yield test_client
    app.dependency_overrides.clear()
