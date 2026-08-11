from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AppSettings(Base):
    """Single-row table holding UPI/merchant config, editable by Admin without code changes."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    gpay_upi_id: Mapped[str | None] = mapped_column(String(120))
    phonepe_upi_id: Mapped[str | None] = mapped_column(String(120))
    paytm_upi_id: Mapped[str | None] = mapped_column(String(120))
    merchant_name: Mapped[str] = mapped_column(String(120), nullable=False)
    merchant_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_note: Mapped[str | None] = mapped_column(String(200))
