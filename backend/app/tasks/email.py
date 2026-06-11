import logging
import smtplib
from email.mime.text import MIMEText

from app.celery_app import celery_app
from app.config import settings

logger = logging.getLogger(__name__)


def _send_email(to: str, subject: str, body: str) -> bool:
    """Send an email via SMTP. Returns True on success."""
    if not settings.smtp_host:
        logger.warning("SMTP not configured; skipping email to %s", to)
        return False

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_user
    msg["To"] = to

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_user and settings.smtp_password:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


@celery_app.task
def send_order_confirmation_email(user_email: str, order_id: str) -> bool:
    subject = f"Potwierdzenie zamówienia #{order_id[:8]}"
    body = (
        f"Dziękujemy za złożenie zamówienia #{order_id[:8]}!\n\n"
        f"Status: potwierdzone\n"
        f"Możesz śledzić status zamówienia w swoim panelu klienta.\n\n"
        f"Pozdrawiamy,\nRestauracja"
    )
    return _send_email(user_email, subject, body)


@celery_app.task
def send_order_status_update_email(user_email: str, order_id: str, status: str) -> bool:
    subject = f"Aktualizacja zamówienia #{order_id[:8]}"
    body = (
        f"Status Twojego zamówienia #{order_id[:8]} został zmieniony na: {status}.\n\n"
        f"Pozdrawiamy,\nRestauracja"
    )
    return _send_email(user_email, subject, body)
