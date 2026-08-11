from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentMode


class CollectorCustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_number: str
    name: str
    mobile: str
    address: str | None
    monthly_amount: float


class PaymentDetailOut(BaseModel):
    payment_id: int
    subscription_id: int
    customer_id: int
    customer_number: str
    customer_name: str
    mobile: str
    payment_mode: PaymentMode
    amount: float
    submitted_date: datetime
    approved_date: datetime | None
    month: int
    year: int


class RejectPaymentIn(BaseModel):
    remarks: str | None = Field(default=None, max_length=500)


class CashPaymentIn(BaseModel):
    customer_id: int
    amount: float | None = Field(default=None, gt=0)
    payment_date: date | None = None
    remarks: str | None = Field(default=None, max_length=500)


class DashboardOut(BaseModel):
    pending_verification_count: int
    completed_today_count: int
    todays_total_collection: float
    todays_cash_collection: float
    todays_online_collection: float
