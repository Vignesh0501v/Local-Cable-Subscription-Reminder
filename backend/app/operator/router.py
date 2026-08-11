from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import Date as SADate
from sqlalchemy import cast, func
from sqlalchemy.orm import Session

from app.audit import log_audit
from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.customer import Customer
from app.models.enums import PaymentStatus, SubscriptionStatus, UserRole
from app.models.monthly_subscription import MonthlySubscription
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.user import User
from app.schemas.operator import OperatorDashboardOut, QueueItemOut, SubscriptionHistoryItemOut

router = APIRouter(prefix="/operator", tags=["operator"])
operator_only = require_roles(UserRole.OPERATOR)


def _latest_payment_ids_subquery(db: Session):
    return (
        db.query(Payment.subscription_id, func.max(Payment.id).label("max_id"))
        .group_by(Payment.subscription_id)
        .subquery()
    )


def _to_queue_item(
    sub: MonthlySubscription, customer: Customer, plan: Plan, payment: Payment | None
) -> QueueItemOut:
    return QueueItemOut(
        subscription_id=sub.id,
        customer_id=customer.id,
        customer_number=customer.customer_number,
        customer_name=customer.name,
        mobile=customer.mobile,
        plan_name=plan.plan_name if plan else "",
        amount=float(sub.amount),
        month=sub.month,
        year=sub.year,
        verified_date=payment.approved_date if payment else None,
        payment_mode=payment.payment_mode if payment else None,
    )


def _queue_rows(db: Session, filters: list):
    latest_ids = _latest_payment_ids_subquery(db)
    return (
        db.query(MonthlySubscription, Customer, Plan, Payment)
        .join(Customer, MonthlySubscription.customer_id == Customer.id)
        .join(Plan, Customer.plan_id == Plan.id)
        .outerjoin(latest_ids, latest_ids.c.subscription_id == MonthlySubscription.id)
        .outerjoin(Payment, Payment.id == latest_ids.c.max_id)
        .filter(*filters)
    )


@router.get("/queue", response_model=list[QueueItemOut])
def get_queue(
    db: Session = Depends(get_db), current_user: User = Depends(operator_only)
) -> list[QueueItemOut]:
    rows = (
        _queue_rows(
            db,
            [
                MonthlySubscription.payment_status == PaymentStatus.VERIFIED,
                MonthlySubscription.subscription_status == SubscriptionStatus.PENDING,
            ],
        )
        .order_by(MonthlySubscription.updated_at)
        .all()
    )
    return [_to_queue_item(sub, customer, plan, payment) for sub, customer, plan, payment in rows]


@router.post("/subscriptions/{subscription_id}/activate", response_model=QueueItemOut)
def activate_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(operator_only),
) -> QueueItemOut:
    subscription = db.get(MonthlySubscription, subscription_id)
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    if (
        subscription.payment_status != PaymentStatus.VERIFIED
        or subscription.subscription_status != SubscriptionStatus.PENDING
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Subscription is not awaiting activation"
        )

    customer = db.get(Customer, subscription.customer_id)
    plan = db.get(Plan, customer.plan_id)

    old_value = {"subscription_status": subscription.subscription_status.value}
    subscription.subscription_status = SubscriptionStatus.ACTIVE

    log_audit(
        db,
        current_user,
        "activate",
        "monthly_subscriptions",
        subscription.id,
        old_value,
        {"subscription_status": "active"},
    )
    db.commit()
    db.refresh(subscription)

    latest_payment = (
        db.query(Payment)
        .filter(Payment.subscription_id == subscription.id)
        .order_by(Payment.id.desc())
        .first()
    )

    return _to_queue_item(subscription, customer, plan, latest_payment)


@router.get("/subscriptions/completed-today", response_model=list[QueueItemOut])
def list_completed_today(
    db: Session = Depends(get_db), current_user: User = Depends(operator_only)
) -> list[QueueItemOut]:
    today = date.today()
    rows = (
        _queue_rows(
            db,
            [
                MonthlySubscription.subscription_status == SubscriptionStatus.ACTIVE,
                cast(MonthlySubscription.updated_at, SADate) == today,
            ],
        )
        .order_by(MonthlySubscription.updated_at.desc())
        .all()
    )
    return [_to_queue_item(sub, customer, plan, payment) for sub, customer, plan, payment in rows]


@router.get("/dashboard", response_model=OperatorDashboardOut)
def get_dashboard(
    db: Session = Depends(get_db), current_user: User = Depends(operator_only)
) -> OperatorDashboardOut:
    today = date.today()

    waiting_count = (
        db.query(MonthlySubscription)
        .filter(
            MonthlySubscription.payment_status == PaymentStatus.VERIFIED,
            MonthlySubscription.subscription_status == SubscriptionStatus.PENDING,
        )
        .count()
    )
    completed_today_count = (
        db.query(MonthlySubscription)
        .filter(
            MonthlySubscription.subscription_status == SubscriptionStatus.ACTIVE,
            cast(MonthlySubscription.updated_at, SADate) == today,
        )
        .count()
    )

    return OperatorDashboardOut(
        waiting_for_subscription_count=waiting_count, completed_today_count=completed_today_count
    )


@router.get("/customers/{customer_id}/subscriptions", response_model=list[SubscriptionHistoryItemOut])
def get_customer_subscription_history(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(operator_only),
) -> list[SubscriptionHistoryItemOut]:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    rows = (
        db.query(MonthlySubscription)
        .filter(MonthlySubscription.customer_id == customer_id)
        .order_by(MonthlySubscription.year.desc(), MonthlySubscription.month.desc())
        .all()
    )
    return [
        SubscriptionHistoryItemOut(
            subscription_id=r.id,
            month=r.month,
            year=r.year,
            amount=float(r.amount),
            payment_status=r.payment_status,
            subscription_status=r.subscription_status,
        )
        for r in rows
    ]
