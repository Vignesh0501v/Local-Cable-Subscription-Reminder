from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.audit import log_audit
from app.auth.dependencies import require_roles
from app.database import get_db
from app.models.enums import UserRole
from app.models.settings import AppSettings
from app.models.user import User
from app.schemas.settings import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])
admin_only = require_roles(UserRole.ADMIN)

SETTINGS_ROW_ID = 1


@router.get("", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> AppSettings:
    row = db.get(AppSettings, SETTINGS_ROW_ID)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="UPI settings have not been configured yet"
        )
    return row


@router.put("", response_model=SettingsOut)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
) -> AppSettings:
    row = db.get(AppSettings, SETTINGS_ROW_ID)
    data = payload.model_dump()

    if row is None:
        row = AppSettings(id=SETTINGS_ROW_ID, **data)
        db.add(row)
        old_value = None
    else:
        old_value = {
            "gpay_upi_id": row.gpay_upi_id,
            "phonepe_upi_id": row.phonepe_upi_id,
            "paytm_upi_id": row.paytm_upi_id,
            "merchant_name": row.merchant_name,
            "merchant_phone": row.merchant_phone,
            "payment_note": row.payment_note,
        }
        for field, value in data.items():
            setattr(row, field, value)

    log_audit(db, current_user, "upsert", "settings", SETTINGS_ROW_ID, old_value, data)
    db.commit()
    db.refresh(row)
    return row
