import uuid

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.order import Order

stripe.api_key = settings.stripe_secret_key


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
