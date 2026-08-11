from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.audit import log_audit
from app.auth.dependencies import require_roles
from app.auth.security import hash_password
from app.database import get_db
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.schemas.staff import ResetPasswordIn, StaffCreate, StaffOut, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])
admin_only = require_roles(UserRole.ADMIN)

MANAGEABLE_ROLES = (UserRole.COLLECTOR, UserRole.OPERATOR)


def _get_manageable_staff_or_404(db: Session, staff_id: int) -> User:
    user = db.get(User, staff_id)
    if user is None or user.role not in MANAGEABLE_ROLES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")
    return user


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(
    payload: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> User:
    if payload.role not in MANAGEABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role must be 'collector' or 'operator'",
        )
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()

    log_audit(
        db,
        current_user,
        "create",
        "users",
        user.id,
        None,
        {"name": user.name, "email": user.email, "role": user.role.value},
    )
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=list[StaffOut])
def list_staff(
    role: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> list[User]:
    query = db.query(User).filter(User.role.in_(MANAGEABLE_ROLES))
    if role is not None:
        if role not in MANAGEABLE_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role filter")
        query = query.filter(User.role == role)
    return query.order_by(User.name).all()


@router.get("/{staff_id}", response_model=StaffOut)
def get_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> User:
    return _get_manageable_staff_or_404(db, staff_id)


@router.put("/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: int,
    payload: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> User:
    user = _get_manageable_staff_or_404(db, staff_id)
    old_value = {"name": user.name, "phone": user.phone}
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(user, field, value)

    log_audit(db, current_user, "update", "users", user.id, old_value, updates)
    db.commit()
    db.refresh(user)
    return user


def _set_staff_status(db: Session, current_user: User, staff_id: int, new_status: UserStatus) -> User:
    user = _get_manageable_staff_or_404(db, staff_id)
    old_status = user.status.value
    user.status = new_status
    log_audit(
        db, current_user, "update", "users", user.id, {"status": old_status}, {"status": new_status.value}
    )
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{staff_id}/disable", response_model=StaffOut)
def disable_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> User:
    return _set_staff_status(db, current_user, staff_id, UserStatus.DISABLED)


@router.patch("/{staff_id}/enable", response_model=StaffOut)
def enable_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> User:
    return _set_staff_status(db, current_user, staff_id, UserStatus.ACTIVE)


@router.post("/{staff_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_staff_password(
    staff_id: int,
    payload: ResetPasswordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> None:
    user = _get_manageable_staff_or_404(db, staff_id)
    user.password_hash = hash_password(payload.new_password)

    log_audit(db, current_user, "reset_password", "users", user.id, None, None)
    db.commit()
