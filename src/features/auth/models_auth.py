from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True, nullable=False
    )
    # Null for accounts created purely through social login (no local password).
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    # "local" | "google" | "facebook"
    provider: Mapped[str] = mapped_column(String(20), default="local", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
