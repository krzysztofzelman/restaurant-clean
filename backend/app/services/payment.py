import time
import uuid

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.order import Order

stripe.api_key = settings.stripe_secret_key

# In-memory idempotency store for processed webhook events (order IDs).
# TTL-based: entries expire after 24 hours.
# For multi-worker deployments, replace with Redis.
_processed_events: dict[str, float] = {}
_EVENT_TTL = 86400  # 24 hours


def _is_event_processed(order_id: str) -> bool:
    """Check if a webhook event for this order was already processed."""
    now = time.time()
    # Clean stale entries lazily
    stale = [k for k, ts in _processed_events.items() if now - ts > _EVENT_TTL]
    for k in stale:
        _processed_events.pop(k, None)
    return order_id in _processed_events


def _mark_event_processed(order_id: str) -> None:
    """Mark a webhook event as processed."""
    _processed_events[order_id] = time.time()


def create_payment_intent(order_id: uuid.UUID, db: Session) -> dict:
    """Create a Stripe PaymentIntent for an order."""
    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if order is None:
        raise ValueError("Order not found")
    if order.payment_status == "paid":
        raise ValueError("Order is already paid")

    try:
        intent = stripe.PaymentIntent.create(
            amount=int(order.total_amount * 100),  # cents
            currency="pln",
            metadata={"order_id": str(order.id)},
        )
    except stripe.error.StripeError as e:
        raise ValueError(f"Stripe error: {e.user_message or e}")

    return {"client_secret": intent.client_secret, "payment_intent_id": intent.id}


def handle_webhook(payload: bytes, sig_header: str) -> str:
    """Verify and handle Stripe webhook event. Returns order_id or None."""
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise ValueError("Invalid webhook signature")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        order_id = intent["metadata"].get("order_id")
        return order_id

    return None
