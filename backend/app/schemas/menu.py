import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class MenuItemCreate(BaseModel):
    name: str
    description: str | None = None
    price: Decimal
    category: str
    is_available: bool = True
    image_url: str | None = None


class MenuItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    category: str | None = None
    is_available: bool | None = None
    image_url: str | None = None


class MenuItemResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    price: float
    category: str
    is_available: bool
    image_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
