"""Shared fixtures for backend tests."""

import os

# Override DB to SQLite BEFORE any app module is imported
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_placeholder"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_placeholder"

import uuid
from collections.abc import Generator

import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker

# --- SQLite compatibility for PostgreSQL-specific types ---

# Make JSONB work on SQLite: compile as JSON DDL
@compiles(JSONB, "sqlite")
def _compile_jsonb_as_json(element, compiler, **kw):
    return compiler.visit_JSON(element)


# Make PostgreSQL UUID work on SQLite: convert Python uuid.UUID → str at bind time
import sqlite3

sqlite3.register_adapter(uuid.UUID, lambda u: str(u))


# --- Now safe to import app modules ---
from app.database import Base, get_db as _real_get_db
from app.main import app

TEST_DB_URL = os.environ["DATABASE_URL"]
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Provide a test DB session."""
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient with overridden DB dependency."""
    app.dependency_overrides[_real_get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session) -> dict:
    """Create a test user and return its attributes."""
    from app.models.user import User

    hashed = bcrypt.hashpw(b"test1234", bcrypt.gensalt()).decode("utf-8")
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash=hashed,
        full_name="Test User",
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": str(user.id),
        "email": user.email,
        "password": "test1234",
        "full_name": user.full_name,
        "role": user.role,
    }
