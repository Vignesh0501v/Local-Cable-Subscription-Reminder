from datetime import date

from pydantic import BaseModel

from app.models.enums import PaymentMode, PaymentStatus, SubscriptionStatus


class PublicSubscriptionOut(BaseModel):
    customer_name: str
    customer_number: str
    plan_name: str
    month: int
    year: int
    amount: float
    due_date: date
    payment_status: PaymentStatus
    subscription_status: SubscriptionStatus
    upi_links: dict[str, str | None] | None


class PublicPayRequest(BaseModel):
    payment_mode: PaymentMode
