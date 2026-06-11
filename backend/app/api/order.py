import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import _get_current_user, require_role
from app.database import get_db
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse, PaymentStatusUpdate, StatusUpdate
from app.services import order as order_service

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(
    body: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    try:
        order = order_service.create_order(db, current_user.id, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return order


@router.get("", response_model=list[OrderResponse])
def list_orders(
    status_filter: str | None = Query(None, alias="status"),
    courier_id: uuid.UUID | None = Query(None, alias="courier_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    return order_service.list_orders(
        db,
        user_id=current_user.id,
        status_filter=status_filter,
        role=current_user.role,
        courier_id=courier_id,
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    order = order_service.get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    # Access control: regular users can only see their own orders
    if current_user.role == "user" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return order


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_status(
    order_id: uuid.UUID,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "kitchen", "courier")),
):
    courier_id = current_user.id if current_user.role == "courier" else None
    try:
        order = order_service.update_order_status(
            db, order_id, body.status, courier_id=courier_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}/payment-status", response_model=OrderResponse)
def update_payment_status(
    order_id: uuid.UUID,
    body: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Update payment status manually (admin only — for testing)."""
    order = order_service.get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order.payment_status = body.payment_status
    db.commit()
    db.refresh(order)
    return order
