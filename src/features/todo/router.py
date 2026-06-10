from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.auth.deps import get_current_user
from src.features.auth.models_auth import User
from src.features.todo import crud, schemas
from src.features.todo.models import DayPage, TodoItem
from src.store.database import get_db

router = APIRouter(prefix="/todo", tags=["todo"])


def _get_owned_todo(db: Session, todo_id: int, user: User) -> TodoItem:
    todo = crud.get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo item not found.")
    day_page = db.get(DayPage, todo.day_page_id)
    if not day_page or day_page.user_id != user.id:
        raise HTTPException(status_code=404, detail="Todo item not found.")
    return todo


@router.post("/day-pages", response_model=schemas.DayPageRead, status_code=status.HTTP_201_CREATED)
def create_day_page(
    payload: schemas.DayPageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_day = crud.get_day_page_by_date(db, payload.date, current_user.id)
    if existing_day:
        raise HTTPException(status_code=409, detail="Day page for this date already exists.")

    day_page = crud.create_day_page(db, payload, current_user.id)
    return day_page


@router.get("/day-pages/{target_date}", response_model=schemas.DayPageRead)
def read_day_page(
    target_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day_page = crud.get_day_page_by_date(db, target_date, current_user.id)
    if not day_page:
        raise HTTPException(status_code=404, detail="Day page not found.")

    day_page.todos.sort(key=lambda todo: todo.position)
    return day_page


@router.get("/day-pages/", response_model=list[schemas.DayPageRead])
def list_day_pages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.list_day_pages(db, current_user.id)


@router.post("/day-pages/{day_page_id}/items", response_model=schemas.TodoItemRead, status_code=status.HTTP_201_CREATED)
def create_todo_item(
    day_page_id: int,
    payload: schemas.TodoItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day_page = db.get(DayPage, day_page_id)
    if not day_page or day_page.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Day page not found.")
    todo = crud.add_todo_item(db, day_page_id, payload)
    return todo


@router.patch("/items/{todo_id}", response_model=schemas.TodoItemRead)
def patch_todo_item(
    todo_id: int,
    payload: schemas.TodoItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = _get_owned_todo(db, todo_id, current_user)
    updated = crud.update_todo_item(db, todo, payload)
    return updated


@router.delete("/items/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_todo_item(
    todo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    todo = _get_owned_todo(db, todo_id, current_user)
    crud.delete_todo_item(db, todo)


@router.delete("/day-pages/clear-done", status_code=status.HTTP_204_NO_CONTENT)
def clear_done_todos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud.delete_all_done_todos(db, current_user.id)


@router.delete("/day-pages/clear-done/older-than", status_code=status.HTTP_204_NO_CONTENT)
def clear_done_todos_older_than(
    days: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    crud.delete_done_todos_older_than(db, days, current_user.id)
