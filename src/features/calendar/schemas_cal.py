import datetime as dt
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _validate_time(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if not TIME_RE.match(value):
        raise ValueError("Vrijeme mora biti u formatu HH:MM (00–23).")
    return value


class CalendarEventCreate(BaseModel):
    date: dt.date
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=7000)
    start_time: str | None = None
    end_time: str | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def check_times(cls, value: str | None) -> str | None:
        return _validate_time(value)


class CalendarEventUpdate(BaseModel):
    date: dt.date | None = None
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=7000)
    start_time: str | None = None
    end_time: str | None = None

    @field_validator("start_time", "end_time")
    @classmethod
    def check_times(cls, value: str | None) -> str | None:
        return _validate_time(value)


class CalendarEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: dt.date
    title: str
    description: str | None = None
    start_time: str | None = None
    end_time: str | None = None


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
