from datetime import datetime

from pydantic import BaseModel


class AdminDashboardOut(BaseModel):
    total_customers: int
    active_customers: int
    pending_payment_count: int
    pending_verification_count: int
    pending_subscription_count: int
    revenue_this_month: float
    collections_today: float


class ActivityItemOut(BaseModel):
    id: int
    user_name: str | None
    action: str
    table_name: str
    record_id: int
    timestamp: datetime
