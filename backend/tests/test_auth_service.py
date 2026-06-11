"""Tests for auth service: password hashing and JWT token management."""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_user_by_email,
    get_user_by_id,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        hashed = hash_password("my_password")
        assert hashed != "my_password"
        assert verify_password("my_password", hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_same_password_different_hashes(self):
        """Each hash should be unique due to bcrypt salt."""
        h1 = hash_password("test")
        h2 = hash_password("test")
        assert h1 != h2


class TestJWTTokens:
    def test_create_access_token(self):
        uid = uuid.uuid4()
        token = create_access_token(uid, "admin")
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == str(uid)
        assert payload["role"] == "admin"
        assert payload["type"] == "access"

    def test_create_refresh_token(self):
        uid = uuid.uuid4()
        token = create_refresh_token(uid)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == str(uid)
        assert payload["type"] == "refresh"
        assert "role" not in payload

    def test_decode_invalid_token_returns_none(self):
        assert decode_token("invalid.token.here") is None

    def test_decode_expired_token(self, monkeypatch):
        """Token with exp in the past should be rejected."""
        uid = uuid.uuid4()
        monkeypatch.setattr("app.services.auth.settings.access_token_expire_minutes", -1)
        token = create_access_token(uid, "user")
        assert decode_token(token) is None


class TestUserQueries:
    def test_get_user_by_email(self, db: Session, test_user: dict):
        user = get_user_by_email(db, test_user["email"])
        assert user is not None
        assert str(user.id) == test_user["id"]
        assert user.email == test_user["email"]

    def test_get_user_by_nonexistent_email(self, db: Session):
        assert get_user_by_email(db, "nonexistent@example.com") is None

    def test_get_user_by_id(self, db: Session, test_user: dict):
        uid = uuid.UUID(test_user["id"])
        user = get_user_by_id(db, uid)
        assert user is not None
        assert user.email == test_user["email"]

    def test_get_user_by_nonexistent_id(self, db: Session):
        assert get_user_by_id(db, uuid.uuid4()) is None


class TestAuthentication:
    def test_authenticate_valid(self, db: Session, test_user: dict):
        user = authenticate_user(db, test_user["email"], test_user["password"])
        assert user is not None
        assert str(user.id) == test_user["id"]

    def test_authenticate_wrong_password(self, db: Session, test_user: dict):
        user = authenticate_user(db, test_user["email"], "wrong_password")
        assert user is None

    def test_authenticate_nonexistent_email(self, db: Session):
        user = authenticate_user(db, "noone@example.com", "password")
        assert user is None

    def test_authenticate_inactive_user(self, db: Session, test_user: dict):
        from app.models.user import User
        from sqlalchemy import select

        user = db.execute(select(User).where(User.email == test_user["email"])).scalar_one()
        user.is_active = False
        db.commit()

        result = authenticate_user(db, test_user["email"], test_user["password"])
        assert result is None
