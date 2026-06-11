import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.menu_item import MenuItem
from app.schemas.menu import MenuItemCreate, MenuItemUpdate


def list_menu_items(
    db: Session, category: str | None = None, available_only: bool = True
) -> list[MenuItem]:
    stmt = select(MenuItem)
    if available_only:
        stmt = stmt.where(MenuItem.is_available == True)  # noqa: E712
    if category:
        stmt = stmt.where(MenuItem.category == category)
    stmt = stmt.order_by(MenuItem.category, MenuItem.name)
    return list(db.execute(stmt).scalars().all())


def get_menu_item(db: Session, item_id: uuid.UUID) -> MenuItem | None:
    return db.execute(
        select(MenuItem).where(MenuItem.id == item_id)
    ).scalar_one_or_none()


def create_menu_item(db: Session, data: MenuItemCreate) -> MenuItem:
    item = MenuItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_menu_item(
    db: Session, item_id: uuid.UUID, data: MenuItemUpdate
) -> MenuItem | None:
    item = get_menu_item(db, item_id)
    if item is None:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_menu_item(db: Session, item_id: uuid.UUID) -> bool:
    item = get_menu_item(db, item_id)
    if item is None:
        return False
    db.delete(item)
    db.commit()
    return True


def list_categories(db: Session) -> list[str]:
    stmt = (
        select(MenuItem.category)
        .where(MenuItem.is_available == True)  # noqa: E712
        .distinct()
        .order_by(MenuItem.category)
    )
    return [row[0] for row in db.execute(stmt).all()]
