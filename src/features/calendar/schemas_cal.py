import datetime as dt

from pydantic import BaseModel, ConfigDict, Field


class CalendarEventCreate(BaseModel):
    date: dt.date
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=7000)


class CalendarEventUpdate(BaseModel):
    date: dt.date | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=7000)


class CalendarEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: dt.date
    title: str
    description: str | None = None


# ─── Aggregated day overview ────────────────────────────────────


class DayTodo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    done: bool = False


class DayObligation(BaseModel):
    id: int
    title: str
    priority: str
    due_date: dt.date | None = None


class CalendarDayRead(BaseModel):
    date: dt.date
    events: list[CalendarEventRead] = Field(default_factory=list)
    todos: list[DayTodo] = Field(default_factory=list)
    obligations: list[DayObligation] = Field(default_factory=list)
