from sqlalchemy import select
from sqlalchemy.orm import Session

from src.features.auth.models_auth import User


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_user(
    db: Session,
    email: str,
    hashed_password: str | None,
    full_name: str | None = None,
    provider: str = "local",
) -> User:
    user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        provider=provider,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
