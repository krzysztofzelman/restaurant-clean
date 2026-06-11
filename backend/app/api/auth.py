import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RoleUpdateRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_user_by_email,
    get_user_by_id,
    hash_password,
)
from app.config import settings
from app.limiter import limiter

REFRESH_COOKIE_KEY = "restaurant_refresh_token"

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Set refresh token as httpOnly, Secure, SameSite=Strict cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=token,
        httponly=True,
        samesite="strict",
        secure=False,  # set True in production with HTTPS
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_KEY,
        path="/api/auth",
        httponly=True,
        samesite="strict",
        secure=False,
    )


def _get_current_user(
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: validate Bearer token and return User."""
    if not authorization:
        raise HTTPException(
            status_code=401, detail="Missing authorization header"
        )
    payload = decode_token(authorization.removeprefix("Bearer "))
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_role(*roles: str):
    """Dependency factory: require one of the specified roles."""

    def _check_role(user: User = Depends(_get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _check_role


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = hash_password(body.password)
    user = User(
        email=body.email,
        password_hash=hashed,
        full_name=body.full_name,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Read refresh token from httpOnly cookie, return new tokens."""
    refresh_token = request.cookies.get(REFRESH_COOKIE_KEY)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Rotate: issue new refresh token, invalidate old one (via cookie replacement)
    new_access = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, new_refresh)

    return TokenResponse(access_token=new_access)


@router.post("/logout")
def logout(response: Response):
    """Clear the refresh cookie."""
    _clear_refresh_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(_get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """List all users (admin only)."""
    stmt = select(User).order_by(User.created_at.desc())
    return list(db.execute(stmt).scalars().all())


@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: uuid.UUID,
    body: RoleUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Update user role (admin only)."""
    if body.role not in ("user", "kitchen", "admin", "courier"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role: {body.role}. Must be one of: user, kitchen, admin, courier",
        )
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user
