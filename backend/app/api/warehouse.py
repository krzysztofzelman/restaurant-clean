import uuid

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.auth import require_role
from app.database import get_db
from app.models.ingredient import Ingredient, IngredientBatch, MenuItemIngredient
from app.schemas.warehouse import (
    BatchCreate,
    BatchResponse,
    IngredientCreate,
    IngredientResponse,
    IngredientUpdate,
    RecipeResponse,
    RecipeSet,
    WarehouseStats,
)

router = APIRouter(prefix="/api/warehouse", tags=["warehouse"])


# ── Ingredients ──────────────────────────────────────────────────


@router.get("/ingredients", response_model=list[IngredientResponse])
def list_ingredients(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    stmt = select(Ingredient).order_by(Ingredient.name).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


@router.post(
    "/ingredients",
    response_model=IngredientResponse,
    status_code=201,
)
def create_ingredient(
    body: IngredientCreate,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    ingredient = Ingredient(**body.model_dump())
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient


@router.put("/ingredients/{item_id}", response_model=IngredientResponse)
def update_ingredient(
    item_id: uuid.UUID,
    body: IngredientUpdate,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    ingredient = db.execute(
        select(Ingredient).where(Ingredient.id == item_id)
    ).scalar_one_or_none()
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(ingredient, key, value)
    db.commit()
    db.refresh(ingredient)
    return ingredient


# ── Batches ──────────────────────────────────────────────────────


@router.get("/batches", response_model=list[BatchResponse])
def list_batches(
    ingredient_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(IngredientBatch).order_by(IngredientBatch.received_at.desc())
    if ingredient_id:
        stmt = stmt.where(IngredientBatch.ingredient_id == ingredient_id)
    return list(db.execute(stmt).scalars().all())


@router.post("/batches", response_model=BatchResponse, status_code=201)
def add_batch(
    body: BatchCreate,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    # Verify ingredient exists
    ingredient = db.execute(
        select(Ingredient).where(Ingredient.id == body.ingredient_id)
    ).scalar_one_or_none()
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    batch = IngredientBatch(**body.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


# ── Recipes ──────────────────────────────────────────────────────


@router.get("/recipes/{menu_item_id}", response_model=RecipeResponse)
def get_recipe(menu_item_id: uuid.UUID, db: Session = Depends(get_db)):
    stmt = (
        select(MenuItemIngredient)
        .where(MenuItemIngredient.menu_item_id == menu_item_id)
    )
    items = list(db.execute(stmt).scalars().all())
    return RecipeResponse(
        menu_item_id=menu_item_id,
        ingredients=[
            {"ingredient_id": i.ingredient_id, "quantity_needed": float(i.quantity_needed)}
            for i in items
        ],
    )


@router.put("/recipes/{menu_item_id}", response_model=RecipeResponse)
def set_recipe(
    menu_item_id: uuid.UUID,
    body: RecipeSet,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    # Remove old recipe
    old = db.execute(
        select(MenuItemIngredient).where(
            MenuItemIngredient.menu_item_id == menu_item_id
        )
    ).scalars().all()
    for item in old:
        db.delete(item)

    # Insert new recipe items
    for ri in body.items:
        db.add(
            MenuItemIngredient(
                menu_item_id=menu_item_id,
                ingredient_id=ri.ingredient_id,
                quantity_needed=ri.quantity_needed,
            )
        )
    db.commit()

    return get_recipe(menu_item_id, db)


# ── Stats ────────────────────────────────────────────────────────


@router.get("/stats", response_model=WarehouseStats)
def warehouse_stats(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT * FROM get_warehouse_stats()")).one()
    return WarehouseStats(
        low_stock_count=result[0],
        expiring_soon_count=result[1],
        expired_count=result[2],
    )


@router.get("/revenue")
def revenue(
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin", "kitchen")),
):
    result = db.execute(text("SELECT * FROM track_revenue()")).one()
    return {"today": float(result[0]), "week": float(result[1]), "month": float(result[2])}


# ── Delete endpoints ──────────────────────────────────────────────


@router.delete("/ingredients/{item_id}", status_code=204)
def delete_ingredient(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    ingredient = db.execute(
        select(Ingredient).where(Ingredient.id == item_id)
    ).scalar_one_or_none()
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.delete(ingredient)
    db.commit()


@router.delete("/batches/{batch_id}", status_code=204)
def delete_batch(
    batch_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    batch = db.execute(
        select(IngredientBatch).where(IngredientBatch.id == batch_id)
    ).scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(batch)
    db.commit()
