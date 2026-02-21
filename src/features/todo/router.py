from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.todo import crud, schemas
from src.features.todo.models import DayPage
from src.store.database import get_db

router = APIRouter(prefix="/todo", tags=["todo"])


@router.post("/day-pages", response_model=schemas.DayPageRead, status_code=status.HTTP_201_CREATED)
def create_day_page(payload: schemas.DayPageCreate, db: Session = Depends(get_db)):
    existing_day = crud.get_day_page_by_date(db, payload.date)
    if existing_day:
        raise HTTPException(status_code=409, detail="Day page for this date already exists.")

    day_page = crud.create_day_page(db, payload)
    return day_page


@router.get("/day-pages/{target_date}", response_model=schemas.DayPageRead)
def read_day_page(target_date: date, db: Session = Depends(get_db)):
    day_page = crud.get_day_page_by_date(db, target_date)
    if not day_page:
        raise HTTPException(status_code=404, detail="Day page not found.")

    day_page.todos.sort(key=lambda todo: todo.position)
    return day_page


@router.post("/day-pages/{day_page_id}/items", response_model=schemas.TodoItemRead, status_code=status.HTTP_201_CREATED)
def create_todo_item(day_page_id: int, payload: schemas.TodoItemCreate, db: Session = Depends(get_db)):
    day_page_exists = db.get(DayPage, day_page_id)
    if not day_page_exists:
        raise HTTPException(status_code=404, detail="Day page not found.")

    todo = crud.add_todo_item(db, day_page_id, payload)
    return todo


@router.patch("/items/{todo_id}", response_model=schemas.TodoItemRead)
def patch_todo_item(todo_id: int, payload: schemas.TodoItemUpdate, db: Session = Depends(get_db)):
    todo = crud.get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo item not found.")

    updated = crud.update_todo_item(db, todo, payload)
    return updated


@router.delete("/items/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_todo_item(todo_id: int, db: Session = Depends(get_db)):
    todo = crud.get_todo_by_id(db, todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo item not found.")

    crud.delete_todo_item(db, todo)
