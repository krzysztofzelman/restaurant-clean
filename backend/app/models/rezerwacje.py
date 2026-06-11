import uuid
from datetime import date, time, datetime

from sqlalchemy import CheckConstraint, Date, Time, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Reservation(Base):
    __tablename__ = "rezerwacje"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    time: Mapped[time] = mapped_column(Time, nullable=False)
    guests: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(
        default="pending",
        server_default="pending",
    )
    notes: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.now,
    )

    user: Mapped["User"] = relationship(back_populates="reservations")

    __table_args__ = (
        CheckConstraint("guests >= 1", name="ck_rezerwacje_guests"),
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled')",
            name="ck_rezerwacje_status",
        ),
    )
