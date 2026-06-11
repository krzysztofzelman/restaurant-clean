"""Seed test users with proper bcrypt hashes.

Run on first startup to replace `__SEED_ME__` placeholders.
"""
import uuid

import bcrypt
from sqlalchemy import text
from sqlalchemy.orm import Session

TEST_USERS = [
    {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "admin@restauracja.pl",
        "password": "admin123",
        "full_name": "Administrator",
        "role": "admin",
    },
    {
        "id": "00000000-0000-0000-0000-000000000002",
        "email": "kitchen@restauracja.pl",
        "password": "kitchen123",
        "full_name": "Kuchnia",
        "role": "kitchen",
    },
    {
        "id": "00000000-0000-0000-0000-000000000003",
        "email": "kurier@restauracja.pl",
        "password": "kurier123",
        "full_name": "Kurier",
        "role": "courier",
    },
    {
        "id": "00000000-0000-0000-0000-000000000004",
        "email": "jan@example.com",
        "password": "user123",
        "full_name": "Jan Kowalski",
        "role": "user",
    },
]


def seed_users(db: Session) -> None:
    """Insert or update test users with bcrypt hashed passwords."""
    for user in TEST_USERS:
        hashed = bcrypt.hashpw(user["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        stmt = text("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (:id, :email, :password_hash, :full_name, :role)
            ON CONFLICT (email) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role
        """)
        db.execute(
            stmt,
            {
                "id": uuid.UUID(user["id"]),
                "email": user["email"],
                "password_hash": hashed,
                "full_name": user["full_name"],
                "role": user["role"],
            },
        )
    db.commit()
