import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings

def resolve_database_url(database_url: str) -> str:
    runtime_dir = os.getenv("GREEN_CREDITS_RUNTIME_DIR")
    if not runtime_dir and os.getenv("VERCEL"):
        runtime_dir = "/tmp/greencredits"

    if not runtime_dir or not database_url.startswith("sqlite:///./"):
        return database_url

    database_name = database_url.removeprefix("sqlite:///./")
    runtime_path = Path(runtime_dir)
    runtime_path.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{runtime_path / database_name}"

SQLALCHEMY_DATABASE_URL = resolve_database_url(str(settings.DATABASE_URL))

# SQLite fallback config just in case, but Postgres is expected
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    """
    Dependency to get a database session for each request.
    Closes the session when request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
