import secrets
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import CustomerStatus


def generate_access_token() -> str:
    return secrets.token_urlsafe(24)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(String(500))
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), nullable=False)
    monthly_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    collector_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    status: Mapped[CustomerStatus] = mapped_column(
        Enum(CustomerStatus, name="customer_status"), nullable=False, default=CustomerStatus.ACTIVE
    )
    access_token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, default=generate_access_token, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
