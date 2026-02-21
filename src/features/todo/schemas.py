from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class TodoItemBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    done: bool = False
    position: int = 0


class TodoItemCreate(TodoItemBase):
    pass


class TodoItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    done: bool | None = None
    position: int | None = None


class TodoItemRead(TodoItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_page_id: int


class DayPageCreate(BaseModel):
    date: date
    note: str | None = Field(default=None, max_length=500)


class DayPageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date
    note: str | None = None
    todos: list[TodoItemRead] = Field(default_factory=list)
