from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import log_audit
from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.enums import UserRole
from app.models.plan import Plan
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanOut, PlanUpdate

router = APIRouter(prefix="/plans", tags=["plans"])
admin_only = require_roles(UserRole.ADMIN)


@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Plan:
    plan = Plan(**payload.model_dump())
    db.add(plan)
    db.flush()
    log_audit(db, current_user, "create", "plans", plan.id, None, payload.model_dump())
    db.commit()
    db.refresh(plan)
    return plan


@router.get("", response_model=list[PlanOut])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> list[Plan]:
    return db.query(Plan).order_by(Plan.id).all()


@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Plan:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.put("/{plan_id}", response_model=PlanOut)
def update_plan(
    plan_id: int,
    payload: PlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> Plan:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    old_value = {"plan_name": plan.plan_name, "price": float(plan.price), "description": plan.description}
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(plan, field, value)

    log_audit(db, current_user, "update", "plans", plan.id, old_value, updates)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> None:
    plan = db.get(Plan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    old_value = {"plan_name": plan.plan_name, "price": float(plan.price)}
    db.delete(plan)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Plan is in use by one or more customers"
        ) from exc

    log_audit(db, current_user, "delete", "plans", plan_id, old_value, None)
    db.commit()
