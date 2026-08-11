import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    COLLECTOR = "collector"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"


class CustomerStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    VERIFIED = "verified"


class SubscriptionStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"


class PaymentMode(str, enum.Enum):
    UPI_GPAY = "upi_gpay"
    UPI_PHONEPE = "upi_phonepe"
    UPI_PAYTM = "upi_paytm"
    CASH = "cash"


class NotificationType(str, enum.Enum):
    SMS = "sms"
    WHATSAPP = "whatsapp"


class NotificationStatus(str, enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    SIMULATED = "simulated"
