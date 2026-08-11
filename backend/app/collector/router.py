from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import Date as SADate
from sqlalchemy import cast, func
from sqlalchemy.orm import Session

from app.audit import log_audit
from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.customer import Customer
from app.models.enums import CustomerStatus, PaymentMode, PaymentStatus, UserRole
from app.models.monthly_subscription import MonthlySubscription
from app.models.payment import Payment
from app.models.user import User
from app.schemas.collector import (
    CashPaymentIn,
    CollectorCustomerOut,
    DashboardOut,
    PaymentDetailOut,
    RejectPaymentIn,
)
from app.subscriptions import get_or_create_current_subscription

router = APIRouter(prefix="/collector", tags=["collector"])
collector_only = require_roles(UserRole.COLLECTOR)


def _to_payment_detail(payment: Payment, subscription: MonthlySubscription, customer: Customer) -> PaymentDetailOut:
    return PaymentDetailOut(
        payment_id=payment.id,
        subscription_id=subscription.id,
        customer_id=customer.id,
        customer_number=customer.customer_number,
        customer_name=customer.name,
        mobile=customer.mobile,
        payment_mode=payment.payment_mode,
        amount=float(payment.amount),
        submitted_date=payment.submitted_date,
        approved_date=payment.approved_date,
        month=subscription.month,
        year=subscription.year,
    )


@router.get("/customers", response_model=list[CollectorCustomerOut])
def list_assigned_customers(
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_only),
) -> list[Customer]:
    query = db.query(Customer).filter(
        Customer.collector_id == current_user.id, Customer.status == CustomerStatus.ACTIVE
    )
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(like))
            | (Customer.mobile.ilike(like))
            | (Customer.customer_number.ilike(like))
        )
    return query.order_by(Customer.name).all()


@router.get("/payments/pending", response_model=list[PaymentDetailOut])
def list_pending_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_only),
) -> list[PaymentDetailOut]:
    # Only the latest payment row per subscription can be "the" pending submission --
    # an older row from a since-rejected attempt on the same subscription must not resurface here.
    latest_ids = (
        db.query(func.max(Payment.id).label("max_id"))
        .group_by(Payment.subscription_id)
        .subquery()
    )
    rows = (
        db.query(Payment, MonthlySubscription, Customer)
        .join(latest_ids, Payment.id == latest_ids.c.max_id)
        .join(MonthlySubscription, Payment.subscription_id == MonthlySubscription.id)
        .join(Customer, MonthlySubscription.customer_id == Customer.id)
        .filter(
            Customer.collector_id == current_user.id,
            MonthlySubscription.payment_status == PaymentStatus.SUBMITTED,
        )
        .order_by(Payment.submitted_date)
        .all()
    )
    return [_to_payment_detail(payment, sub, customer) for payment, sub, customer in rows]


def _get_owned_payment(
    db: Session, collector_id: int, payment_id: int
) -> tuple[Payment, MonthlySubscription, Customer]:
    row = (
        db.query(Payment, MonthlySubscription, Customer)
        .join(MonthlySubscription, Payment.subscription_id == MonthlySubscription.id)
        .join(Customer, MonthlySubscription.customer_id == Customer.id)
        .filter(Payment.id == payment_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    payment, subscription, customer = row
    if customer.collector_id != collector_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This customer is not assigned to you"
        )
    return payment, subscription, customer


@router.post("/payments/{payment_id}/approve", response_model=PaymentDetailOut)
def approve_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_only),
) -> PaymentDetailOut:
    payment, subscription, customer = _get_owned_payment(db, current_user.id, payment_id)
    if subscription.payment_status != PaymentStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Payment is not awaiting verification"
        )

    old_value = {"payment_status": subscription.payment_status.value}
    subscription.payment_status = PaymentStatus.VERIFIED
    payment.approved_by = current_user.id
    payment.approved_date = datetime.now(timezone.utc)

    log_audit(
        db, current_user, "approve", "payments", payment.id, old_value, {"payment_status": "verified"}
    )
    db.commit()
    db.refresh(payment)
    db.refresh(subscription)

    return _to_payment_detail(payment, subscription, customer)


@router.post("/payments/{payment_id}/reject", response_model=PaymentDetailOut)
def reject_payment(
    payment_id: int,
    payload: RejectPaymentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_only),
) -> PaymentDetailOut:
    payment, subscription, customer = _get_owned_payment(db, current_user.id, payment_id)
    if subscription.payment_status != PaymentStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Payment is not awaiting verification"
        )

    old_value = {"payment_status": subscription.payment_status.value}
    subscription.payment_status = PaymentStatus.PENDING
    payment.remarks = payload.remarks or "Rejected by collector"
    # approved_by/approved_date are left null: this payment attempt was never approved,
    # so those fields keep meaning exactly "verified by X at time Y" everywhere else they're read.

    log_audit(
        db,
        current_user,
        "reject",
        "payments",
        payment.id,
        old_value,
        {"payment_status": "pending", "remarks": payment.remarks},
    )
    db.commit()
    db.refresh(payment)
    db.refresh(subscription)

    return _to_payment_detail(payment, subscription, customer)


@router.post("/cash-payments", response_model=PaymentDetailOut, status_code=status.HTTP_201_CREATED)
def record_cash_payment(
    payload: CashPaymentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_only),
) -> PaymentDetailOut:
    customer = db.get(Customer, payload.customer_id)
    if (
        customer is None
        or customer.collector_id != current_user.id
        or customer.status != CustomerStatus.ACTIVE
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found or not assigned to you"
        )

    subscription = get_or_create_current_subscription(db, customer)
    if subscription.payment_status != PaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This month's payment is already submitted or verified",
        )

    amount = payload.amount if payload.amount is not None else float(subscription.amount)
    submitted_at = (
        datetime.combine(payload.payment_date, datetime.min.time(), tzinfo=timezone.utc)
        if payload.payment_date
        else datetime.now(timezone.utc)
    )
    now = datetime.now(timezone.utc)

    payment = Payment(
        subscription_id=subscription.id,
        payment_mode=PaymentMode.CASH,
        amount=amount,
        submitted_date=submitted_at,
        approved_by=current_user.id,
        approved_date=now,
        remarks=payload.remarks,
    )
    db.add(payment)
    subscription.payment_status = PaymentStatus.VERIFIED
    db.flush()

    log_audit(
        db,
        current_user,
        "create",
        "payments",
        payment.id,
        None,
        {"payment_mode": "cash", "amount": amount, "customer_id": customer.id},
    )
    db.commit()
    db.refresh(payment)
    db.refresh(subscription)

    return _to_payment_detail(payment, subscription, customer)


@router.get("/payments/completed-today", response_model=list[PaymentDetailOut])
def list_completed_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_only),
) -> list[PaymentDetailOut]:
    today = date.today()
    rows = (
        db.query(Payment, MonthlySubscription, Customer)
        .join(MonthlySubscription, Payment.subscription_id == MonthlySubscription.id)
        .join(Customer, MonthlySubscription.customer_id == Customer.id)
        .filter(
            Payment.approved_by == current_user.id,
            cast(Payment.approved_date, SADate) == today,
        )
        .order_by(Payment.approved_date.desc())
        .all()
    )
    return [_to_payment_detail(payment, sub, customer) for payment, sub, customer in rows]


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(collector_only),
) -> DashboardOut:
    today = date.today()

    pending_verification_count = (
        db.query(MonthlySubscription)
        .join(Customer, MonthlySubscription.customer_id == Customer.id)
        .filter(
            Customer.collector_id == current_user.id,
            MonthlySubscription.payment_status == PaymentStatus.SUBMITTED,
        )
        .count()
    )

    todays_payments = (
        db.query(Payment)
        .filter(
            Payment.approved_by == current_user.id,
            cast(Payment.approved_date, SADate) == today,
        )
        .all()
    )

    todays_cash = sum(float(p.amount) for p in todays_payments if p.payment_mode == PaymentMode.CASH)
    todays_online = sum(float(p.amount) for p in todays_payments if p.payment_mode != PaymentMode.CASH)

    return DashboardOut(
        pending_verification_count=pending_verification_count,
        completed_today_count=len(todays_payments),
        todays_total_collection=todays_cash + todays_online,
        todays_cash_collection=todays_cash,
        todays_online_collection=todays_online,
    )
