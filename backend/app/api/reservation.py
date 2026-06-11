import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.auth import _get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.reservation import (
    ReservationCreate,
    ReservationResponse,
    ReservationUpdate,
)
from app.services import reservation as reservation_service

router = APIRouter(prefix="/api/reservations", tags=["reservations"])


@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(
    body: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    return reservation_service.create_reservation(db, current_user.id, body)


@router.get("", response_model=list[ReservationResponse])
def list_reservations(
    status_filter: str | None = Query(None, alias="status"),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    return reservation_service.list_reservations(
        db, current_user, status_filter=status_filter, start_date=start_date, end_date=end_date
    )


@router.get("/{reservation_id}", response_model=ReservationResponse)
def get_reservation(
    reservation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    reservation = reservation_service.get_reservation(db, reservation_id)
    if reservation.user_id != current_user.id and current_user.role != "admin":
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own reservations",
        )
    return reservation


@router.put("/{reservation_id}", response_model=ReservationResponse)
def update_reservation(
    reservation_id: uuid.UUID,
    body: ReservationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    return reservation_service.update_reservation(db, reservation_id, body, current_user)


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(
    reservation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    reservation_service.delete_reservation(db, reservation_id, current_user)
