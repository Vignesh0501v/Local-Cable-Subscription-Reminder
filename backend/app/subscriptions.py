from datetime import date

from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.monthly_subscription import MonthlySubscription


def get_or_create_current_subscription(db: Session, customer: Customer) -> MonthlySubscription:
    """Every customer owes for the current calendar month; lazily materialize that row
    on first access rather than requiring the (not-yet-built) monthly scheduler to have run."""
    today = date.today()
    subscription = (
        db.query(MonthlySubscription)
        .filter(
            MonthlySubscription.customer_id == customer.id,
            MonthlySubscription.month == today.month,
            MonthlySubscription.year == today.year,
        )
        .first()
    )
    if subscription is None:
        subscription = MonthlySubscription(
            customer_id=customer.id,
            month=today.month,
            year=today.year,
            amount=customer.monthly_amount,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    return subscription
