from pydantic import BaseModel, ConfigDict, Field

from src.features.obligations.models import PriorityLevel


class ObligationBase(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=500)
    priority: PriorityLevel = PriorityLevel.MID
    completed: bool = False
    position: int = 0


class ObligationCreate(ObligationBase):
    pass


class ObligationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=500)
    priority: PriorityLevel | None = None
    completed: bool | None = None
    position: int | None = None


class ObligationRead(ObligationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
