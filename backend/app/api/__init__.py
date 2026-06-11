from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.menu import router as menu_router
from app.api.order import router as order_router
from app.api.payment import router as payment_router
from app.api.reservation import router as reservation_router
from app.api.upload import router as upload_router
from app.api.warehouse import router as warehouse_router

__all__ = ["auth_router", "chat_router", "menu_router", "order_router", "payment_router", "reservation_router", "upload_router", "warehouse_router"]
