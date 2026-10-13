import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

import backend.app.db.session as db_session_module
from backend.app.main import app
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.api.v1.endpoints.games import ensure_canonical_games

# Create in-memory SQLite engine
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Create tables on both test_engine and db_session_module.engine
    Base.metadata.create_all(bind=test_engine)
    try:
        Base.metadata.create_all(bind=db_session_module.engine)
    except Exception:
        pass

    db = TestingSessionLocal()
    ensure_canonical_games(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    try:
        Base.metadata.drop_all(bind=db_session_module.engine)
    except Exception:
        pass


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

