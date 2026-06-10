from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.features.calendar.models_cal import CalendarEvent
from src.features.calendar.schemas_cal import (
    CalendarEventCreate,
    CalendarEventUpdate,
    DayObligation,
)
from src.features.obligations.models_ob import Obligation, ObligationItem
from src.features.todo.models import DayPage, TodoItem


def create_event(
    db: Session, payload: CalendarEventCreate, user_id: int
) -> CalendarEvent:
    event = CalendarEvent(
        date=payload.date,
        title=payload.title,
        description=payload.description,
        user_id=user_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def list_events(
    db: Session, user_id: int, target_date: date | None = None
) -> list[CalendarEvent]:
    statement = select(CalendarEvent).where(CalendarEvent.user_id == user_id)
    if target_date is not None:
        statement = statement.where(CalendarEvent.date == target_date)
    statement = statement.order_by(CalendarEvent.date, CalendarEvent.id)
    return list(db.scalars(statement).all())


def get_event_by_id(
    db: Session, event_id: int, user_id: int
) -> CalendarEvent | None:
    event = db.get(CalendarEvent, event_id)
    if not event or event.user_id != user_id:
        return None
    return event


def update_event(
    db: Session, event: CalendarEvent, payload: CalendarEventUpdate
) -> CalendarEvent:
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(event, field_name, value)

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event: CalendarEvent) -> None:
    db.delete(event)
    db.commit()


def get_todos_for_date(
    db: Session, target_date: date, user_id: int
) -> list[TodoItem]:
    day_page = db.scalar(
        select(DayPage).where(
            DayPage.date == target_date, DayPage.user_id == user_id
        )
    )
    if not day_page:
        return []
    return sorted(day_page.todos, key=lambda todo: todo.position)


def get_obligations_for_date(
    db: Session, target_date: date, user_id: int
) -> list[DayObligation]:
    statement = (
        select(ObligationItem, Obligation.title)
        .join(Obligation, ObligationItem.obligation_id == Obligation.id)
        .where(ObligationItem.due_date == target_date, Obligation.user_id == user_id)
        .order_by(ObligationItem.id)
    )
    rows = db.execute(statement).all()
    return [
        DayObligation(
            id=item.id,
            title=item.title,
            priority=priority,
            due_date=item.due_date,
        )
        for item, priority in rows
    ]
