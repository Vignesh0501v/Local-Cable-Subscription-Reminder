from datetime import datetime

from pydantic import BaseModel

from app.models.enums import NotificationStatus, NotificationType


class NotificationOut(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    customer_number: str
    type: NotificationType
    message: str
    status: NotificationStatus
    sent_time: datetime | None


class SendReminderResult(BaseModel):
    customer_id: int
    customer_name: str
    sms_status: NotificationStatus
    whatsapp_status: NotificationStatus


class SendRemindersResponse(BaseModel):
    total_customers: int
    results: list[SendReminderResult]
