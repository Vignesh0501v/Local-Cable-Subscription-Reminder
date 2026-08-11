"""Seed an initial Admin user for local development.

Run with: python -m app.seed
"""

from app.auth.security import hash_password
from app.database import SessionLocal
from app.models.enums import UserRole, UserStatus
from app.models.user import User

ADMIN_EMAIL = "admin@localcablenetwork.com"
ADMIN_PASSWORD = "Admin@12345"


def seed_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"Admin user already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            name="System Admin",
            email=ADMIN_EMAIL,
            phone="9999999999",
            password_hash=hash_password(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)
        db.commit()
        print(f"Created admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
