from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.features.obligations.models_ob import Obligation, ObligationItem
from src.features.obligations.schemas_ob import ObligationCreate, ObligationItemCreate, ObligationUpdate

def create_obligation(db: Session, payload: ObligationCreate, user_id: int) -> Obligation:
    obligation = Obligation(
        title=payload.title,
        description=payload.description,
        created_at=payload.created_at,
        user_id=user_id,
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
        due_date=payload.due_date,
        created_at=payload.created_at,
    )
    db.add(obligation_item)
    db.commit()
    db.refresh(obligation_item)
    return obligation_item


def get_obligation_item_by_id(db: Session, item_id: int) -> ObligationItem | None:
    statement = select(ObligationItem).where(ObligationItem.id == item_id)
    return db.scalar(statement)

def get_obligation_by_id(
    db: Session, obligation_id: int, user_id: int
) -> Obligation | None:
    statement = (
        select(Obligation)
        .options(selectinload(Obligation.obligation_items))
        .where(Obligation.id == obligation_id, Obligation.user_id == user_id)
    )
    obligation = db.scalar(statement)
    if obligation:
        obligation.obligation_items.sort(key=lambda item: item.id)
    return obligation

def update_obligation(db: Session, obligation: Obligation, payload: ObligationUpdate) -> Obligation:
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


def delete_obligation_item(db: Session, obligation_item: ObligationItem) -> None:
    db.delete(obligation_item)
    db.commit()

def list_obligations(
    db: Session, user_id: int, title: str | None = None
) -> list[Obligation]:
    statement = (
        select(Obligation)
        .options(selectinload(Obligation.obligation_items))
        .where(Obligation.user_id == user_id)
    )
    if title:
        statement = statement.where(Obligation.title == title)
    obligations = list(db.scalars(statement).all())
    for obligation in obligations:
        obligation.obligation_items.sort(key=lambda item: item.id)
    return obligations

def get_obligation_by_title(
    db: Session, title: str, user_id: int
) -> Obligation | None:
    statement = (
        select(Obligation)
        .options(selectinload(Obligation.obligation_items))
        .where(Obligation.title == title, Obligation.user_id == user_id)
    )
    obligation = db.scalar(statement)
    if obligation:
        obligation.obligation_items.sort(key=lambda item: item.id)
    return obligation
