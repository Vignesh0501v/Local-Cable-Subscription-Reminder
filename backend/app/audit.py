import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


def _serialize(value: dict[str, Any] | None) -> str | None:
    if value is None:
        return None
    return json.dumps(value, default=str)


def log_audit(
    db: Session,
    user: User,
    action: str,
    table_name: str,
    record_id: int,
    old_value: dict[str, Any] | None,
    new_value: dict[str, Any] | None,
) -> None:
    """Stage an audit log row on the given session. Caller is responsible for committing,
    so this lands in the same transaction as the mutation it describes."""
    db.add(
        AuditLog(
            user_id=user.id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_value=_serialize(old_value),
            new_value=_serialize(new_value),
        )
    )
