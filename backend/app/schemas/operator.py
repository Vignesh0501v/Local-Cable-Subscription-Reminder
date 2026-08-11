from datetime import datetime

from pydantic import BaseModel

from app.models.enums import PaymentMode, PaymentStatus, SubscriptionStatus


class QueueItemOut(BaseModel):
    subscription_id: int
    customer_id: int
    customer_number: str
    customer_name: str
    mobile: str
    plan_name: str
    amount: float
    month: int
    year: int
    verified_date: datetime | None
    payment_mode: PaymentMode | None


class SubscriptionHistoryItemOut(BaseModel):
    subscription_id: int
    month: int
    year: int
    amount: float
    payment_status: PaymentStatus
    subscription_status: SubscriptionStatus


class OperatorDashboardOut(BaseModel):
    waiting_for_subscription_count: int
    completed_today_count: int
