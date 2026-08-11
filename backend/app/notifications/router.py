from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.customer import Customer
from app.models.enums import CustomerStatus, NotificationStatus, NotificationType, UserRole
from app.models.notification import Notification
from app.models.user import User
from app.notifications.service import send_monthly_reminders, send_reminder_to_customer
from app.schemas.notification import NotificationOut, SendReminderResult, SendRemindersResponse

router = APIRouter(prefix="/admin/notifications", tags=["notifications"])
admin_only = require_roles(UserRole.ADMIN)


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    customer_id: int | None = None,
    type_filter: NotificationType | None = Query(default=None, alias="type"),
    status_filter: NotificationStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> list[NotificationOut]:
    query = db.query(Notification, Customer).join(Customer, Notification.customer_id == Customer.id)
    if customer_id is not None:
        query = query.filter(Notification.customer_id == customer_id)
    if type_filter is not None:
        query = query.filter(Notification.type == type_filter)
    if status_filter is not None:
        query = query.filter(Notification.status == status_filter)

    rows = query.order_by(Notification.id.desc()).limit(limit).all()
    return [
        NotificationOut(
            id=n.id,
            customer_id=c.id,
            customer_name=c.name,
            customer_number=c.customer_number,
            type=n.type,
            message=n.message,
            status=n.status,
            sent_time=n.sent_time,
        )
        for n, c in rows
    ]


@router.post("/send-reminders", response_model=SendRemindersResponse)
def trigger_monthly_reminders(
    db: Session = Depends(get_db), current_user: User = Depends(admin_only)
) -> SendRemindersResponse:
    results = send_monthly_reminders(db)
    return SendRemindersResponse(
        total_customers=len(results),
        results=[
            SendReminderResult(
                customer_id=customer.id,
                customer_name=customer.name,
                sms_status=sms_n.status,
                whatsapp_status=wa_n.status,
            )
            for customer, sms_n, wa_n in results
        ],
    )


@router.post("/send-reminders/{customer_id}", response_model=SendReminderResult)
def trigger_single_reminder(
    customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_only)
) -> SendReminderResult:
    customer = db.get(Customer, customer_id)
    if customer is None or customer.status != CustomerStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active customer not found")

    sms_n, wa_n = send_reminder_to_customer(db, customer)
    return SendReminderResult(
        customer_id=customer.id,
        customer_name=customer.name,
        sms_status=sms_n.status,
        whatsapp_status=wa_n.status,
    )
