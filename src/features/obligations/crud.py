from sqlalchemy import select
from sqlalchemy.orm import Session

from src.features.obligations.models import Obligation, PriorityLevel
from src.features.obligations.schemas import (
    ObligationCreate,
    ObligationUpdate,
)


def create_obligation(db: Session, payload: ObligationCreate) -> Obligation:
    """Kreiraj novu obavezu."""
    obligation = Obligation(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        completed=payload.completed,
        position=payload.position,
    )
    db.add(obligation)
    db.commit()
    db.refresh(obligation)
    return obligation


def get_all_obligations(db: Session) -> list[Obligation]:
    """Preuzmi sve obaveze sortirane po prioritetu i poziciji."""
    statement = (
        select(Obligation)
        .order_by(
            # Sortiranje: HIGH -> MID -> LOW, zatim po position
            Obligation.priority,
            Obligation.position,
        )
    )
    return db.scalars(statement).all()


def get_obligations_by_priority(db: Session, priority: PriorityLevel) -> list[Obligation]:
    """Preuzmi obaveze po prioritetu."""
    statement = (
        select(Obligation)
        .where(Obligation.priority == priority)
        .order_by(Obligation.position)
    )
    return db.scalars(statement).all()


def get_obligation_by_id(db: Session, obligation_id: int) -> Obligation | None:
    """Preuzmi obavezu po ID-u."""
    statement = select(Obligation).where(Obligation.id == obligation_id)
    return db.scalar(statement)


def update_obligation(
    db: Session, obligation: Obligation, payload: ObligationUpdate
) -> Obligation:
    """Ažuriraj obavezu."""
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(obligation, field_name, value)

    db.add(obligation)
    db.commit()
    db.refresh(obligation)
    return obligation


def delete_obligation(db: Session, obligation_id: int) -> bool:
    """Obriši obavezu."""
    obligation = get_obligation_by_id(db, obligation_id)
    if not obligation:
        return False

    db.delete(obligation)
    db.commit()
    return True