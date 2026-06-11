import uuid
from datetime import date, time, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ReservationCreate(BaseModel):
    date: date
    time: time
    guests: int = Field(ge=1, le=50)
    notes: Optional[str] = None

    @field_validator("date")
    @classmethod
    def date_not_in_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("Date cannot be in the past")
        return v


class ReservationUpdate(BaseModel):
    date: Optional[date] = None
    time: Optional[time] = None
    guests: Optional[int] = Field(default=None, ge=1, le=50)
    status: Optional[str] = Field(
        default=None, pattern=r"^(pending|confirmed|cancelled)$"
    )
    notes: Optional[str] = None

    @field_validator("date")
    @classmethod
    def date_not_in_past(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v < date.today():
            raise ValueError("Date cannot be in the past")
        return v


class ReservationUserBrief(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str

    model_config = {"from_attributes": True}


class ReservationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    time: time
    guests: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    user: ReservationUserBrief | None = None

    model_config = {"from_attributes": True}
