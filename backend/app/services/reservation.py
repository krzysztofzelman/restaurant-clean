import uuid
from datetime import date, time, datetime

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload

from app.models.rezerwacje import Reservation
from app.models.user import User
from app.schemas.reservation import ReservationCreate, ReservationUpdate

VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["cancelled"],
    "cancelled": [],
}


def _check_slot_available(
    db: Session, reservation_date: date, reservation_time: time, exclude_id: uuid.UUID | None = None
) -> None:
    """Check if the time slot is free (max 10 overlapping reservations)."""
    stmt = select(Reservation).where(
        and_(
            Reservation.date == reservation_date,
            Reservation.time == reservation_time,
            Reservation.status.in_(["pending", "confirmed"]),
        )
    )
    if exclude_id:
        stmt = stmt.where(Reservation.id != exclude_id)
    count = len(db.execute(stmt).scalars().all())
    if count >= 10:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is fully booked. Please choose another time.",
        )


def create_reservation(
    db: Session, user_id: uuid.UUID, body: ReservationCreate
) -> Reservation:
    _check_slot_available(db, body.date, body.time)
    reservation = Reservation(
        user_id=user_id,
        date=body.date,
        time=body.time,
        guests=body.guests,
        notes=body.notes,
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


def get_reservation(db: Session, reservation_id: uuid.UUID) -> Reservation:
    reservation = db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    ).scalar_one_or_none()
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )
    return reservation


def list_reservations(
    db: Session,
    user: User,
    status_filter: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[Reservation]:
    if user.role == "admin":
        stmt = (
            select(Reservation)
            .options(joinedload(Reservation.user))
            .order_by(Reservation.date.desc(), Reservation.time.desc())
        )
    else:
        stmt = (
            select(Reservation)
            .where(Reservation.user_id == user.id)
            .order_by(Reservation.date.desc(), Reservation.time.desc())
        )

    if user.role == "admin":
        if status_filter:
            stmt = stmt.where(Reservation.status == status_filter)
        if start_date:
            stmt = stmt.where(Reservation.date >= start_date)
        if end_date:
            stmt = stmt.where(Reservation.date <= end_date)

    return list(db.execute(stmt).unique().scalars().all())


def update_reservation(
    db: Session, reservation_id: uuid.UUID, body: ReservationUpdate, user: User
) -> Reservation:
    reservation = get_reservation(db, reservation_id)

    # Non-admin users can only update their own reservations
    if reservation.user_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reservations",
        )

    # Validate status transition
    if body.status is not None and body.status != reservation.status:
        allowed = VALID_TRANSITIONS.get(reservation.status, [])
        if body.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot change status from '{reservation.status}' to '{body.status}'",
            )

    # Apply updates
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reservation, field, value)

    db.commit()
    db.refresh(reservation)
    return reservation


def delete_reservation(db: Session, reservation_id: uuid.UUID, user: User) -> None:
    reservation = get_reservation(db, reservation_id)
    if reservation.user_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reservations",
        )
    db.delete(reservation)
    db.commit()
