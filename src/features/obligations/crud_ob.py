from sqlalchemy import select
from sqlalchemy.orm import Session

from src.features.obligations.models_ob import Obligation, ObligationItem
from src.features.obligations.schemas_ob import ObligationCreate, ObligationItemCreate, Obligation

def create_obligation(db: Session, payload: ObligationCreate) -> Obligation:
    obligation = Obligation(
        title=payload.title,
        description=payload.description,
        created_at=payload.created_at,
    )
    db.add(obligation)
    db.commit()
    db.refresh(obligation)
    return obligation

def add_obligation_item(db: Session, obligation_id: int, payload: ObligationItemCreate) -> ObligationItem:
    obligation_item = ObligationItem(
        obligation_id=obligation_id,
        title=payload.title,
        description=payload.description,
        created_at=payload.created_at,
    )
    db.add(obligation_item)
    db.commit()
    db.refresh(obligation_item)
    return obligation_item

def get_obligation_by_id(db: Session, obligation_id: int) -> Obligation | None:
    statement = select(Obligation).where(Obligation.id == obligation_id)
    return db.scalar(statement)

def update_obligation(db: Session, obligation: Obligation, payload: ObligationCreate) -> Obligation:
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(obligation, field_name, value)

    db.add(obligation)
    db.commit()
    db.refresh(obligation)
    return obligation

def delete_obligation(db: Session, obligation: Obligation) -> None:
    db.delete(obligation)
    db.commit()
