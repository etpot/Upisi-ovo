import re

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from src.features.auth.models_auth import User


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(
        select(User).where(func.lower(User.username) == username.lower())
    )


def get_user_by_identifier(db: Session, identifier: str) -> User | None:
    """Find a user whose username OR email matches (case-insensitive)."""
    ident = identifier.strip().lower()
    return db.scalar(
        select(User).where(
            or_(
                func.lower(User.username) == ident,
                func.lower(User.email) == ident,
            )
        )
    )


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def generate_unique_username(db: Session, base: str) -> str:
    """Derive an available username from a base string (used for OAuth signups)."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "", base) or "user"
    cleaned = cleaned[:30]
    if len(cleaned) < 3:
        cleaned = (cleaned + "user")[:30]

    candidate = cleaned
    suffix = 1
    while get_user_by_username(db, candidate):
        tail = str(suffix)
        candidate = f"{cleaned[: 30 - len(tail)]}{tail}"
        suffix += 1
    return candidate


def create_user(
    db: Session,
    username: str,
    email: str,
    hashed_password: str | None,
    provider: str = "local",
) -> User:
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        full_name=username,
        provider=provider,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
