from celery import Celery

from app.config import settings

celery_app = Celery(
    "restaurant",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.cancel_orders",
        "app.tasks.email",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Warsaw",
    enable_utc=True,
    beat_schedule={
        "cancel-unpaid-orders-every-5-minutes": {
            "task": "app.tasks.cancel_orders.cancel_unpaid_orders",
            "schedule": 300.0,
        },
    },
)
