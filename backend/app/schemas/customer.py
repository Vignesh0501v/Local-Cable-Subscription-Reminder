from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CustomerStatus


class CustomerBase(BaseModel):
    customer_number: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=120)
    mobile: str = Field(min_length=10, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    plan_id: int
    monthly_amount: float | None = Field(default=None, gt=0)
    collector_id: int | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    customer_number: str | None = Field(default=None, min_length=1, max_length=30)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    mobile: str | None = Field(default=None, min_length=10, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    plan_id: int | None = None
    monthly_amount: float | None = Field(default=None, gt=0)
    collector_id: int | None = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_number: str
    name: str
    mobile: str
    address: str | None
    plan_id: int
    monthly_amount: float
    collector_id: int | None
    status: CustomerStatus
    access_token: str
    created_at: datetime
