import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import _get_current_user, require_role
from app.database import get_db
from app.schemas.menu import MenuItemCreate, MenuItemResponse, MenuItemUpdate
from app.services import menu as menu_service

router = APIRouter(prefix="/api/menu", tags=["menu"])


@router.get("", response_model=list[MenuItemResponse])
def list_menu(
    category: str | None = Query(None),
    available_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    return menu_service.list_menu_items(db, category, available_only)


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    return menu_service.list_categories(db)


@router.get("/{item_id}", response_model=MenuItemResponse)
def get_item(item_id: uuid.UUID, db: Session = Depends(get_db)):
    item = menu_service.get_menu_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.post("", response_model=MenuItemResponse, status_code=201)
def create_item(
    body: MenuItemCreate,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    return menu_service.create_menu_item(db, body)


@router.put("/{item_id}", response_model=MenuItemResponse)
def update_item(
    item_id: uuid.UUID,
    body: MenuItemUpdate,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    item = menu_service.update_menu_item(db, item_id, body)
    if item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: ... = Depends(require_role("admin")),
):
    deleted = menu_service.delete_menu_item(db, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Menu item not found")
