from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth_router, chat_router, menu_router, order_router, payment_router, reservation_router, upload_router, warehouse_router
from app.config import settings
from app.database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed test users on first startup."""
    db = SessionLocal()
    try:
        from app.seed import seed_users

        seed_users(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Restaurant API",
    description="Backend API dla aplikacji zamówień restauracyjnych",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(menu_router)
app.include_router(order_router)
app.include_router(payment_router)
app.include_router(reservation_router)
app.include_router(upload_router)
app.include_router(warehouse_router)

# Serve uploaded images
IMAGES_DIR = Path("/app/images")
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
