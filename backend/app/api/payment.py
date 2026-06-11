import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.auth import _get_current_user
from app.database import get_db
from app.models.order import Order
from app.models.user import User
from app.services import payment as payment_service
from app.services.payment import _mark_event_processed, _is_event_processed

router = APIRouter(prefix="/api/payment", tags=["payment"])


@router.post("/create-intent")
def create_intent(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    """Create a Stripe PaymentIntent for an order."""
    # Verify ownership
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role == "user" and order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        result = payment_service.create_payment_intent(order_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.post("/webhook")
async def webhook(request: Request):
    """Stripe webhook endpoint (no auth — verified by Stripe signature)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        order_id = payment_service.handle_webhook(payload, sig_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if order_id:
        # Idempotency check — skip if already processed
        if _is_event_processed(order_id):
            return {"received": True, "duplicate": True}

        from app.database import SessionLocal

        db = SessionLocal()
        try:
            order = (
                db.query(Order)
                .filter(Order.id == uuid.UUID(order_id))
                .first()
            )
            if order:
                order.payment_status = "paid"
                db.commit()
                _mark_event_processed(order_id)
        finally:
            db.close()

    return {"received": True}
