from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import settings

# Engine configuration supporting both PostgreSQL and SQLite fallback
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
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


def init_db():
    """Ensure database tables exist."""
    try:
        import backend.app.models  # noqa: F401
        from backend.app.db.base import Base

        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Database table creation encountered an issue: {e}")


# Initialize database tables on load so missing tables can never cause 500 errors
init_db()

