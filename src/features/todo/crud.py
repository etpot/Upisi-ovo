from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from src.features.todo.models import DayPage, TodoItem
from src.features.todo.schemas import DayPageCreate, TodoItemCreate, TodoItemUpdate


def create_day_page(db: Session, payload: DayPageCreate, user_id: int) -> DayPage:
    day_page = DayPage(date=payload.date, note=payload.note, user_id=user_id)
    db.add(day_page)
    db.commit()
    db.refresh(day_page)
    return day_page


def get_day_page_by_date(
    db: Session, target_date: date, user_id: int
) -> DayPage | None:
    statement = select(DayPage).where(
        DayPage.date == target_date, DayPage.user_id == user_id
    )
    return db.scalar(statement)


def list_day_pages(db: Session, user_id: int) -> list[DayPage]:
    statement = (
        select(DayPage)
        .where(DayPage.user_id == user_id)
        .options(selectinload(DayPage.todos))
        .order_by(DayPage.date.desc(), DayPage.created_at.desc())
    )
    day_pages = list(db.scalars(statement).all())

    for day_page in day_pages:
        day_page.todos.sort(key=lambda todo: todo.position)

    return day_pages


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

def delete_all_done_todos(db: Session, user_id: int) -> int:
    statement = (
        select(TodoItem)
        .join(DayPage, TodoItem.day_page_id == DayPage.id)
        .where(TodoItem.done.is_(True), DayPage.user_id == user_id)
    )
    done_todos = db.scalars(statement).all()

    for todo in done_todos:
        db.delete(todo)

    db.commit()
    return len(done_todos)


def delete_done_todos_older_than(db: Session, days: int, user_id: int) -> int:
    cutoff = datetime.utcnow() - timedelta(days=days)
    statement = (
        select(TodoItem)
        .join(DayPage, TodoItem.day_page_id == DayPage.id)
        .where(
            TodoItem.done.is_(True),
            TodoItem.created_at < cutoff,
            DayPage.user_id == user_id,
        )
    )
    done_todos = db.scalars(statement).all()

    for todo in done_todos:
        db.delete(todo)

    db.commit()
    return len(done_todos)
