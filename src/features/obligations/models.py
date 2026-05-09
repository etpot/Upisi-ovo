from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SQLEnum, Integer, String, Boolean, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class PriorityLevel(str, Enum):
    HIGH = "high"
    MID = "mid"
    LOW = "low"


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    priority: Mapped[PriorityLevel] = mapped_column(
        SQLEnum(PriorityLevel), default=PriorityLevel.MID, nullable=False
    )
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    def __repr__(self) -> str:
        return f"<Obligation(id={self.id}, title={self.title}, priority={self.priority})>"
