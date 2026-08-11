from datetime import datetime

from pydantic import BaseModel

from app.models.enums import PaymentMode, PaymentStatus, SubscriptionStatus


class RevenueReportItem(BaseModel):
    month: int
    year: int
    revenue: float
    cash_amount: float
    online_amount: float
    payment_count: int


class PaymentReportItem(BaseModel):
    payment_id: int
    customer_id: int
    customer_number: str
    customer_name: str
    collector_id: int | None
    collector_name: str | None
    payment_mode: PaymentMode
    amount: float
    submitted_date: datetime
    approved_date: datetime | None
    is_approved: bool
    month: int
    year: int


class PendingSubscriptionItem(BaseModel):
    subscription_id: int
    customer_id: int
    customer_number: str
    customer_name: str
    mobile: str
    plan_name: str
    amount: float
    month: int
    year: int
    payment_status: PaymentStatus
    subscription_status: SubscriptionStatus


class AuditLogItem(BaseModel):
    id: int
    user_name: str | None
    action: str
    table_name: str
    record_id: int
    old_value: str | None
    new_value: str | None
    timestamp: datetime


class AuditLogPage(BaseModel):
    total: int
    items: list[AuditLogItem]
