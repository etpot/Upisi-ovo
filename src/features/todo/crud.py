from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.features.todo.models import DayPage, TodoItem
from src.features.todo.schemas import DayPageCreate, TodoItemCreate, TodoItemUpdate


def create_day_page(db: Session, payload: DayPageCreate) -> DayPage:
    day_page = DayPage(date=payload.date, note=payload.note)
    db.add(day_page)
    db.commit()
    db.refresh(day_page)
    return day_page


def get_day_page_by_date(db: Session, target_date: date) -> DayPage | None:
    statement = select(DayPage).where(DayPage.date == target_date)
    return db.scalar(statement)


def add_todo_item(db: Session, day_page_id: int, payload: TodoItemCreate) -> TodoItem:
    todo = TodoItem(
        day_page_id=day_page_id,
        title=payload.title,
        done=payload.done,
        position=payload.position,
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def get_todo_by_id(db: Session, todo_id: int) -> TodoItem | None:
    statement = select(TodoItem).where(TodoItem.id == todo_id)
    return db.scalar(statement)


def update_todo_item(db: Session, todo: TodoItem, payload: TodoItemUpdate) -> TodoItem:
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(todo, field_name, value)

    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def delete_todo_item(db: Session, todo: TodoItem) -> None:
    db.delete(todo)
    db.commit()
