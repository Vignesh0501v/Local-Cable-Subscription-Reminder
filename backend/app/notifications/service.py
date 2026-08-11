from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.customer import Customer
from app.models.enums import CustomerStatus, NotificationStatus, NotificationType
from app.models.monthly_subscription import MonthlySubscription
from app.models.notification import Notification
from app.notifications.sms import SmsNotConfiguredError, SmsSendError, send_sms
from app.subscriptions import get_or_create_current_subscription

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def build_reminder_message(customer: Customer, subscription: MonthlySubscription) -> str:
    month_label = MONTH_NAMES[subscription.month - 1]
    link = f"{settings.frontend_base_url}/pay/{customer.access_token}"
    return (
        f"Dear {customer.name}, your Cable TV subscription for {month_label} is due. "
        f"Amount: Rs.{float(subscription.amount):.2f}. Due Date: 15 {month_label}. "
        f"Pay now: {link}"
    )


def _send_sms_notification(db: Session, customer: Customer, message: str) -> Notification:
    notification = Notification(
        customer_id=customer.id,
        type=NotificationType.SMS,
        message=message,
        status=NotificationStatus.QUEUED,
    )
    db.add(notification)
    db.flush()

    try:
        send_sms(customer.mobile, message)
        notification.status = NotificationStatus.SENT
    except SmsNotConfiguredError:
        notification.status = NotificationStatus.SIMULATED
    except SmsSendError:
        notification.status = NotificationStatus.FAILED

    notification.sent_time = datetime.now(timezone.utc)
    return notification


def _send_whatsapp_notification(db: Session, customer: Customer, message: str) -> Notification:
    # No real WhatsApp Business API integration yet (requires Meta Business verification) --
    # logged as simulated so the reminder history and UI behave identically once it's wired up.
    notification = Notification(
        customer_id=customer.id,
        type=NotificationType.WHATSAPP,
        message=message,
        status=NotificationStatus.SIMULATED,
        sent_time=datetime.now(timezone.utc),
    )
    db.add(notification)
    return notification


def send_reminder_to_customer(db: Session, customer: Customer) -> tuple[Notification, Notification]:
    subscription = get_or_create_current_subscription(db, customer)
    message = build_reminder_message(customer, subscription)

    sms_notification = _send_sms_notification(db, customer, message)
    whatsapp_notification = _send_whatsapp_notification(db, customer, message)

    db.commit()
    db.refresh(sms_notification)
    db.refresh(whatsapp_notification)
    return sms_notification, whatsapp_notification


def send_monthly_reminders(db: Session) -> list[tuple[Customer, Notification, Notification]]:
    customers = db.query(Customer).filter(Customer.status == CustomerStatus.ACTIVE).all()
    return [(customer, *send_reminder_to_customer(db, customer)) for customer in customers]
