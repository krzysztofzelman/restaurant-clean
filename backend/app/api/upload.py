import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session

from app.api.auth import _get_current_user, require_role
from app.database import get_db
from app.models.menu_item import MenuItem
from app.models.user import User

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = Path("/app/images")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("")
def upload_file(
    file: UploadFile = File(...),
    menu_item_id: uuid.UUID | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Upload an image file. Optionally link it to a menu item."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    # Read file content to check size
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 5 MB.",
        )

    # Sanitize filename
    original_name = file.filename or "unknown"
    ext = Path(original_name).suffix or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name

    # Ensure upload dir exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Write file
    file_path.write_bytes(content)

    url_path = f"/images/{unique_name}"

    # Optionally link to menu item
    if menu_item_id:
        menu_item = db.query(MenuItem).filter(MenuItem.id == menu_item_id).first()
        if menu_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Menu item not found",
            )
        menu_item.image_url = url_path
        db.commit()

    return {"url": url_path, "filename": unique_name, "original_name": original_name}


@router.delete("/{filename}")
def delete_file(
    filename: str,
    current_user: User = Depends(require_role("admin")),
):
    """Delete an uploaded image file."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists() or not file_path.is_relative_to(UPLOAD_DIR):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    file_path.unlink()
    return {"deleted": filename}
