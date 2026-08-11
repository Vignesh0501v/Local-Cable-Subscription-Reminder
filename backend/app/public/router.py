from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.models.enums import CustomerStatus, PaymentMode, PaymentStatus
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.settings import AppSettings
from app.schemas.public import PublicPayRequest, PublicSubscriptionOut
from app.subscriptions import get_or_create_current_subscription
from app.upi_links import build_upi_links

router = APIRouter(prefix="/public", tags=["public"])


def _get_customer_by_token(db: Session, token: str) -> Customer:
    customer = db.query(Customer).filter(Customer.access_token == token).first()
    if customer is None or customer.status != CustomerStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired link")
    return customer


def _build_response(db: Session, customer: Customer) -> PublicSubscriptionOut:
    subscription = get_or_create_current_subscription(db, customer)
    plan = db.get(Plan, customer.plan_id)

    upi_links = None
    if subscription.payment_status == PaymentStatus.PENDING:
        settings_row = db.get(AppSettings, 1)
        if settings_row is not None:
            note = f"Cable {customer.customer_number} {subscription.month}-{subscription.year}"
            upi_links = build_upi_links(settings_row, float(subscription.amount), note)

    return PublicSubscriptionOut(
        customer_name=customer.name,
        customer_number=customer.customer_number,
        plan_name=plan.plan_name if plan else "",
        month=subscription.month,
        year=subscription.year,
        amount=float(subscription.amount),
        due_date=date(subscription.year, subscription.month, 15),
        payment_status=subscription.payment_status,
        subscription_status=subscription.subscription_status,
        upi_links=upi_links,
    )


@router.get("/subscription/{token}", response_model=PublicSubscriptionOut)
def get_subscription_status(token: str, db: Session = Depends(get_db)) -> PublicSubscriptionOut:
    customer = _get_customer_by_token(db, token)
    return _build_response(db, customer)


@router.post("/subscription/{token}/pay", response_model=PublicSubscriptionOut)
def submit_payment(
    token: str, payload: PublicPayRequest, db: Session = Depends(get_db)
) -> PublicSubscriptionOut:
    if payload.payment_mode == PaymentMode.CASH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cash payments are recorded by a collector, not submitted online",
        )

    customer = _get_customer_by_token(db, token)
    subscription = get_or_create_current_subscription(db, customer)

    if subscription.payment_status != PaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Payment already submitted for this month"
        )

    payment = Payment(
        subscription_id=subscription.id,
        payment_mode=payload.payment_mode,
        amount=subscription.amount,
    )
    db.add(payment)
    subscription.payment_status = PaymentStatus.SUBMITTED
    db.commit()

    return _build_response(db, customer)
