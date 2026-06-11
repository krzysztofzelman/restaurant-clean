"""Tests for auth API endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


class TestRegister:
    def test_register_success(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={"email": "new@example.com", "password": "pass123", "full_name": "New User"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new@example.com"
        assert data["full_name"] == "New User"
        assert data["role"] == "user"
        assert "id" in data

    def test_register_duplicate_email(self, client: TestClient, test_user: dict):
        resp = client.post(
            "/api/auth/register",
            json={"email": test_user["email"], "password": "pass123", "full_name": "Dup"},
        )
        assert resp.status_code == 409

    def test_register_short_password(self, client: TestClient):
        resp = client.post(
            "/api/auth/register",
            json={"email": "a@b.com", "password": "12345", "full_name": "A"},
        )
        assert resp.status_code == 400


class TestLogin:
    def test_login_success(self, client: TestClient, test_user: dict):
        resp = client.post(
            "/api/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, test_user: dict):
        resp = client.post(
            "/api/auth/login",
            json={"email": test_user["email"], "password": "wrong-password"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        resp = client.post(
            "/api/auth/login",
            json={"email": "noone@example.com", "password": "pass123"},
        )
        assert resp.status_code == 401


class TestMe:
    def test_me_authenticated(self, client: TestClient, test_user: dict):
        # Login first
        login_resp = client.post(
            "/api/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        token = login_resp.json()["access_token"]

        resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == test_user["email"]
        assert data["full_name"] == test_user["full_name"]

    def test_me_unauthenticated(self, client: TestClient):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid"})
        assert resp.status_code == 401

    def test_me_no_header(self, client: TestClient):
        """Missing Authorization header should return 401, not 422."""
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Missing authorization header"
