from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[str] = mapped_column(nullable=False)

    obligation_items: Mapped[list[ObligationItem]] = relationship(
        back_populates="obligation", cascade="all, delete-orphan"
    )

class ObligationItem(Base):
    __tablename__ = "obligation_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    obligation_id: Mapped[int] = mapped_column(
        ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    created_at: Mapped[str] = mapped_column(nullable=False)

    obligation: Mapped[Obligation] = relationship(back_populates="obligation_items")
