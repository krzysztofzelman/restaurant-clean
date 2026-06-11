import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database import SessionLocal

logger = logging.getLogger(__name__)


@celery_app.task
def cancel_unpaid_orders() -> int:
    """Cancel unpaid orders older than 15 minutes."""
    db: Session = SessionLocal()
    try:
        result = db.execute(text("SELECT cancel_unpaid_orders()"))
        db.commit()
        count = result.scalar() or 0
        if count:
            logger.info("Cancelled %d unpaid orders", count)
        return count
    except Exception as e:
        logger.error("Failed to cancel unpaid orders: %s", e)
        db.rollback()
        return 0
    finally:
        db.close()
