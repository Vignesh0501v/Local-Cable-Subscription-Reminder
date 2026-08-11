from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Date as SADate
from sqlalchemy import cast
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.enums import CustomerStatus, PaymentStatus, SubscriptionStatus, UserRole
from app.models.monthly_subscription import MonthlySubscription
from app.models.payment import Payment
from app.models.user import User
from app.schemas.admin import ActivityItemOut, AdminDashboardOut

router = APIRouter(prefix="/admin", tags=["admin"])
admin_only = require_roles(UserRole.ADMIN)


@router.get("/dashboard", response_model=AdminDashboardOut)
def get_dashboard(
    db: Session = Depends(get_db), current_user: User = Depends(admin_only)
) -> AdminDashboardOut:
    today = date.today()

    total_customers = db.query(Customer).count()
    active_customers = db.query(Customer).filter(Customer.status == CustomerStatus.ACTIVE).count()

    this_month_subs = db.query(MonthlySubscription).filter(
        MonthlySubscription.month == today.month, MonthlySubscription.year == today.year
    )

    pending_payment_count = this_month_subs.filter(
        MonthlySubscription.payment_status == PaymentStatus.PENDING
    ).count()
    pending_verification_count = this_month_subs.filter(
        MonthlySubscription.payment_status == PaymentStatus.SUBMITTED
    ).count()
    pending_subscription_count = this_month_subs.filter(
        MonthlySubscription.payment_status == PaymentStatus.VERIFIED,
        MonthlySubscription.subscription_status == SubscriptionStatus.PENDING,
    ).count()

    revenue_this_month = sum(
        float(s.amount)
        for s in this_month_subs.filter(MonthlySubscription.payment_status == PaymentStatus.VERIFIED).all()
    )

    collections_today = sum(
        float(p.amount)
        for p in db.query(Payment)
        .filter(Payment.approved_by.isnot(None), cast(Payment.approved_date, SADate) == today)
        .all()
    )

    return AdminDashboardOut(
        total_customers=total_customers,
        active_customers=active_customers,
        pending_payment_count=pending_payment_count,
        pending_verification_count=pending_verification_count,
        pending_subscription_count=pending_subscription_count,
        revenue_this_month=revenue_this_month,
        collections_today=collections_today,
    )


@router.get("/activity", response_model=list[ActivityItemOut])
def get_recent_activity(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> list[ActivityItemOut]:
    rows = (
        db.query(AuditLog, User)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        ActivityItemOut(
            id=log.id,
            user_name=user.name if user else None,
            action=log.action,
            table_name=log.table_name,
            record_id=log.record_id,
            timestamp=log.timestamp,
        )
        for log, user in rows
    ]
