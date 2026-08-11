from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import log_audit
from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.customer import Customer
from app.models.enums import CustomerStatus, UserRole
from app.models.plan import Plan
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])
admin_only = require_roles(UserRole.ADMIN)


def _get_plan_or_404(db: Session, plan_id: int) -> Plan:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


def _validate_collector(db: Session, collector_id: int | None) -> None:
    if collector_id is None:
        return
    collector = db.get(User, collector_id)
    if collector is None or collector.role != UserRole.COLLECTOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="collector_id must reference an existing user with role 'collector'",
        )


def _get_customer_or_404(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Customer:
    plan = _get_plan_or_404(db, payload.plan_id)
    _validate_collector(db, payload.collector_id)

    if db.query(Customer).filter(Customer.customer_number == payload.customer_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="customer_number already exists")

    data = payload.model_dump()
    if data["monthly_amount"] is None:
        data["monthly_amount"] = float(plan.price)

    customer = Customer(**data)
    db.add(customer)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer already exists") from exc

    log_audit(db, current_user, "create", "customers", customer.id, None, data)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=list[CustomerOut])
def list_customers(
    status_filter: CustomerStatus | None = Query(default=None, alias="status"),
    collector_id: int | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> list[Customer]:
    query = db.query(Customer)
    if status_filter is not None:
        query = query.filter(Customer.status == status_filter)
    if collector_id is not None:
        query = query.filter(Customer.collector_id == collector_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(like))
            | (Customer.mobile.ilike(like))
            | (Customer.customer_number.ilike(like))
        )
    return query.order_by(Customer.id).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Customer:
    return _get_customer_or_404(db, customer_id)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Customer:
    customer = _get_customer_or_404(db, customer_id)
    updates = payload.model_dump(exclude_unset=True)

    if "plan_id" in updates:
        _get_plan_or_404(db, updates["plan_id"])
    if "collector_id" in updates:
        _validate_collector(db, updates["collector_id"])
    if "customer_number" in updates and updates["customer_number"] != customer.customer_number:
        exists = (
            db.query(Customer)
            .filter(Customer.customer_number == updates["customer_number"])
            .first()
        )
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="customer_number already exists"
            )

    old_value = {
        "customer_number": customer.customer_number,
        "name": customer.name,
        "mobile": customer.mobile,
        "address": customer.address,
        "plan_id": customer.plan_id,
        "monthly_amount": float(customer.monthly_amount),
        "collector_id": customer.collector_id,
    }
    for field, value in updates.items():
        setattr(customer, field, value)

    log_audit(db, current_user, "update", "customers", customer.id, old_value, updates)
    db.commit()
    db.refresh(customer)
    return customer


def _set_customer_status(
    db: Session, current_user: User, customer_id: int, new_status: CustomerStatus
) -> Customer:
    customer = _get_customer_or_404(db, customer_id)
    old_status = customer.status.value
    customer.status = new_status
    log_audit(
        db,
        current_user,
        "update",
        "customers",
        customer.id,
        {"status": old_status},
        {"status": new_status.value},
    )
    db.commit()
    db.refresh(customer)
    return customer


@router.patch("/{customer_id}/disable", response_model=CustomerOut)
def disable_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Customer:
    return _set_customer_status(db, current_user, customer_id, CustomerStatus.DISABLED)


@router.patch("/{customer_id}/enable", response_model=CustomerOut)
def enable_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Customer:
    return _set_customer_status(db, current_user, customer_id, CustomerStatus.ACTIVE)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> None:
    customer = _get_customer_or_404(db, customer_id)
    old_value = {"customer_number": customer.customer_number, "name": customer.name}
    db.delete(customer)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer has related payment/subscription records; disable instead of deleting",
        ) from exc

    log_audit(db, current_user, "delete", "customers", customer_id, old_value, None)
    db.commit()
