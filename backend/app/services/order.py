import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem
from app.schemas.order import OrderCreate

# State machine: valid transitions
VALID_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"preparing", "cancelled"},
    "preparing": {"ready", "cancelled"},
    "ready": {"in_transit", "cancelled"},
    "in_transit": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


def create_order(db: Session, user_id: uuid.UUID, data: OrderCreate) -> Order:
    """Create an order with items in a transaction."""
    items_data = []
    total = Decimal("0.00")
    for item in data.items:
        menu_item = db.execute(
            select(MenuItem).where(MenuItem.id == item.menu_item_id)
        ).scalar_one_or_none()
        if menu_item is None:
            raise ValueError(f"Menu item {item.menu_item_id} not found")
        if not menu_item.is_available:
            raise ValueError(f"Menu item '{menu_item.name}' is not available")
        unit_price = Decimal(str(menu_item.price))
        subtotal = unit_price * item.quantity
        total += subtotal
        items_data.append(
            {
                "menu_item_id": item.menu_item_id,
                "quantity": item.quantity,
                "unit_price": unit_price,
                "subtotal": subtotal,
            }
        )

    order = Order(
        user_id=user_id,
        status="pending",
        total_amount=total,
        delivery_address=data.delivery_address,
        notes=data.notes,
    )
    db.add(order)
    db.flush()

    for item in items_data:
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item["menu_item_id"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            subtotal=item["subtotal"],
        )
        db.add(order_item)

    db.commit()
    db.refresh(order)
    return order


def get_order(db: Session, order_id: uuid.UUID) -> Order | None:
    return db.execute(
        select(Order)
        .options(joinedload(Order.user), joinedload(Order.items).joinedload(OrderItem.menu_item))
        .where(Order.id == order_id)
    ).unique().scalar_one_or_none()


def list_orders(
    db: Session,
    user_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    role: str | None = None,
    courier_id: uuid.UUID | None = None,
) -> list[Order]:
    stmt = select(Order).options(
        joinedload(Order.user),
        joinedload(Order.items).joinedload(OrderItem.menu_item),
    )

    if role == "user" and user_id:
        stmt = stmt.where(Order.user_id == user_id)
    elif role == "kitchen":
        stmt = stmt.where(Order.status.in_(["pending", "confirmed", "preparing"]))
    elif role == "courier":
        stmt = stmt.where(Order.status.in_(["ready", "in_transit"]))

    if status_filter:
        stmt = stmt.where(Order.status == status_filter)

    if courier_id:
        stmt = stmt.where(Order.courier_id == courier_id)

    stmt = stmt.order_by(Order.created_at.desc())
    return list(db.execute(stmt).unique().scalars().all())


def update_order_status(
    db: Session,
    order_id: uuid.UUID,
    new_status: str,
    courier_id: uuid.UUID | None = None,
) -> Order | None:
    """Update order status with state machine validation."""
    order = get_order(db, order_id)
    if order is None:
        return None

    allowed = VALID_TRANSITIONS.get(order.status, set())
    if new_status not in allowed:
        raise ValueError(
            f"Invalid transition: {order.status} -> {new_status}"
        )

    order.status = new_status
    if courier_id and new_status == "in_transit":
        order.courier_id = courier_id
        order.delivery_status = "in_delivery"
    elif new_status == "delivered":
        order.delivery_status = "delivered"

    db.commit()
    db.refresh(order)
    return order
