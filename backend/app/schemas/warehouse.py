import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class IngredientCreate(BaseModel):
    name: str
    unit: str
    min_stock: Decimal = Decimal("0")
    category: str | None = None


class IngredientUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    min_stock: Decimal | None = None
    category: str | None = None


class IngredientResponse(BaseModel):
    id: uuid.UUID
    name: str
    unit: str
    min_stock: float
    category: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BatchCreate(BaseModel):
    ingredient_id: uuid.UUID
    quantity: Decimal
    cost_per_unit: Decimal | None = None
    expires_at: datetime | None = None


class BatchResponse(BaseModel):
    id: uuid.UUID
    ingredient_id: uuid.UUID
    quantity: float
    cost_per_unit: float | None
    received_at: datetime
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RecipeItem(BaseModel):
    ingredient_id: uuid.UUID
    quantity_needed: Decimal


class RecipeSet(BaseModel):
    items: list[RecipeItem]


class RecipeResponse(BaseModel):
    menu_item_id: uuid.UUID
    ingredients: list[dict]


class WarehouseStats(BaseModel):
    low_stock_count: int
    expiring_soon_count: int
    expired_count: int
