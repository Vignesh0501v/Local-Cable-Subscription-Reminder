from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.enums import PaymentMode, PaymentStatus, SubscriptionStatus, UserRole
from app.models.monthly_subscription import MonthlySubscription
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.user import User
from app.schemas.reports import (
    AuditLogItem,
    AuditLogPage,
    PaymentReportItem,
    PendingSubscriptionItem,
    RevenueReportItem,
)

router = APIRouter(prefix="/admin/reports", tags=["reports"])
admin_only = require_roles(UserRole.ADMIN)


def _shift_month(year: int, month: int, offset: int) -> tuple[int, int]:
    index = (year * 12 + (month - 1)) + offset
    return index // 12, index % 12 + 1


@router.get("/revenue", response_model=list[RevenueReportItem])
def revenue_report(
    months: int = Query(default=6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> list[RevenueReportItem]:
    today = date.today()
    periods = [_shift_month(today.year, today.month, -offset) for offset in range(months)]
    periods.reverse()

    items: list[RevenueReportItem] = []
    for year, month in periods:
        subs = (
            db.query(MonthlySubscription)
            .filter(
                MonthlySubscription.year == year,
                MonthlySubscription.month == month,
                MonthlySubscription.payment_status == PaymentStatus.VERIFIED,
            )
            .all()
        )
        revenue = sum(float(s.amount) for s in subs)

        payments = (
            db.query(Payment)
            .join(MonthlySubscription, Payment.subscription_id == MonthlySubscription.id)
            .filter(
                MonthlySubscription.year == year,
                MonthlySubscription.month == month,
                Payment.approved_by.isnot(None),
            )
            .all()
        )
        cash_amount = sum(float(p.amount) for p in payments if p.payment_mode == PaymentMode.CASH)
        online_amount = sum(float(p.amount) for p in payments if p.payment_mode != PaymentMode.CASH)

        items.append(
            RevenueReportItem(
                month=month,
                year=year,
                revenue=revenue,
                cash_amount=cash_amount,
                online_amount=online_amount,
                payment_count=len(payments),
            )
        )
    return items


@router.get("/payments", response_model=list[PaymentReportItem])
def payment_report(
    date_from: date | None = None,
    date_to: date | None = None,
    payment_mode: PaymentMode | None = None,
    approved_only: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> list[PaymentReportItem]:
    query = (
        db.query(Payment, MonthlySubscription, Customer)
        .join(MonthlySubscription, Payment.subscription_id == MonthlySubscription.id)
        .join(Customer, MonthlySubscription.customer_id == Customer.id)
    )
    if date_from is not None:
        query = query.filter(func.date(Payment.submitted_date) >= date_from)
    if date_to is not None:
        query = query.filter(func.date(Payment.submitted_date) <= date_to)
    if payment_mode is not None:
        query = query.filter(Payment.payment_mode == payment_mode)
    if approved_only:
        query = query.filter(Payment.approved_by.isnot(None))

    rows = query.order_by(Payment.submitted_date.desc()).limit(limit).all()

    collector_ids = {c.collector_id for _, _, c in rows if c.collector_id is not None}
    collector_names: dict[int, str] = {}
    if collector_ids:
        collector_names = {
            u.id: u.name for u in db.query(User).filter(User.id.in_(collector_ids)).all()
        }

    return [
        PaymentReportItem(
            payment_id=p.id,
            customer_id=c.id,
            customer_number=c.customer_number,
            customer_name=c.name,
            collector_id=c.collector_id,
            collector_name=collector_names.get(c.collector_id) if c.collector_id else None,
            payment_mode=p.payment_mode,
            amount=float(p.amount),
            submitted_date=p.submitted_date,
            approved_date=p.approved_date,
            is_approved=p.approved_by is not None,
            month=sub.month,
            year=sub.year,
        )
        for p, sub, c in rows
    ]


@router.get("/pending-subscriptions", response_model=list[PendingSubscriptionItem])
def pending_subscriptions_report(
    db: Session = Depends(get_db), current_user: User = Depends(admin_only)
) -> list[PendingSubscriptionItem]:
    today = date.today()
    rows = (
        db.query(MonthlySubscription, Customer, Plan)
        .join(Customer, MonthlySubscription.customer_id == Customer.id)
        .join(Plan, Customer.plan_id == Plan.id)
        .filter(
            MonthlySubscription.month == today.month,
            MonthlySubscription.year == today.year,
            ~(
                (MonthlySubscription.payment_status == PaymentStatus.VERIFIED)
                & (MonthlySubscription.subscription_status == SubscriptionStatus.ACTIVE)
            ),
        )
        .order_by(MonthlySubscription.updated_at)
        .all()
    )
    return [
        PendingSubscriptionItem(
            subscription_id=sub.id,
            customer_id=c.id,
            customer_number=c.customer_number,
            customer_name=c.name,
            mobile=c.mobile,
            plan_name=plan.plan_name,
            amount=float(sub.amount),
            month=sub.month,
            year=sub.year,
            payment_status=sub.payment_status,
            subscription_status=sub.subscription_status,
        )
        for sub, c, plan in rows
    ]


@router.get("/audit-logs", response_model=AuditLogPage)
def audit_log_viewer(
    table_name: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> AuditLogPage:
    query = db.query(AuditLog, User).outerjoin(User, AuditLog.user_id == User.id)
    if table_name is not None:
        query = query.filter(AuditLog.table_name == table_name)
    if action is not None:
        query = query.filter(AuditLog.action == action)
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    if date_from is not None:
        query = query.filter(func.date(AuditLog.timestamp) >= date_from)
    if date_to is not None:
        query = query.filter(func.date(AuditLog.timestamp) <= date_to)

    total = query.count()
    rows = query.order_by(AuditLog.id.desc()).offset(offset).limit(limit).all()

    items = [
        AuditLogItem(
            id=log.id,
            user_name=user.name if user else None,
            action=log.action,
            table_name=log.table_name,
            record_id=log.record_id,
            old_value=log.old_value,
            new_value=log.new_value,
            timestamp=log.timestamp,
        )
        for log, user in rows
    ]
    return AuditLogPage(total=total, items=items)
