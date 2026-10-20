from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings

# Engine configuration supporting both PostgreSQL and SQLite fallback
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

def sqlalchemy_database_url(value: str) -> str:
    # requirements install Psycopg 3; make SQLAlchemy select its matching dialect.
    return value.replace("postgresql://", "postgresql+psycopg://", 1) if value.startswith("postgresql://") else value


database_url = sqlalchemy_database_url(settings.DATABASE_URL)

engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

