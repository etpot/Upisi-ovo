from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.auth.deps import get_current_user
from src.features.auth.models_auth import User
from src.features.calendar import crud_cal, schemas_cal
from src.store.database import get_db

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.post(
    "/events",
    response_model=schemas_cal.CalendarEventRead,
    status_code=status.HTTP_201_CREATED,
)
def create_event(
    payload: schemas_cal.CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_cal.create_event(db, payload, current_user.id)


@router.get("/events", response_model=list[schemas_cal.CalendarEventRead])
def list_events(
    target_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_cal.list_events(db, current_user.id, target_date)


@router.patch("/events/{event_id}", response_model=schemas_cal.CalendarEventRead)
def update_event(
    event_id: int,
    payload: schemas_cal.CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = crud_cal.get_event_by_id(db, event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    return crud_cal.update_event(db, event, payload)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = crud_cal.get_event_by_id(db, event_id, current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    crud_cal.delete_event(db, event)


@router.get("/day/{target_date}", response_model=schemas_cal.CalendarDayRead)
def read_day(
    target_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    return schemas_cal.CalendarDayRead(
        date=target_date,
        events=crud_cal.list_events(db, uid, target_date),
        todos=crud_cal.get_todos_for_date(db, target_date, uid),
        obligations=crud_cal.get_obligations_for_date(db, target_date, uid),
    )
