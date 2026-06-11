import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class OrderItemCreate(BaseModel):
    menu_item_id: uuid.UUID
    quantity: int = 1


class OrderCreate(BaseModel):
    items: list[OrderItemCreate]
    delivery_address: str | None = None
    notes: str | None = None


class StatusUpdate(BaseModel):
    status: str


class PaymentStatusUpdate(BaseModel):
    payment_status: str


class MenuItemBrief(BaseModel):
    id: uuid.UUID
    name: str
    price: float
    image_url: str | None = None

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    menu_item_id: uuid.UUID
    quantity: int
    unit_price: float
    subtotal: float
    menu_item: MenuItemBrief | None = None

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    delivery_status: str
    total_amount: float
    payment_status: str
    delivery_address: str | None
    notes: str | None
    courier_id: uuid.UUID | None
    created_at: datetime
    items: list[OrderItemResponse] = []
    user: UserBrief | None = None

    model_config = {"from_attributes": True}
