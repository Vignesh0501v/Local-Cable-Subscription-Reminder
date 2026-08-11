import httpx

from app.config import settings

FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


class SmsSendError(Exception):
    """SMS was attempted against a real provider and failed."""


class SmsNotConfiguredError(SmsSendError):
    """No SMS provider is configured; caller should treat this as simulated, not failed."""


def send_sms(mobile: str, message: str) -> None:
    if not settings.fast2sms_api_key:
        raise SmsNotConfiguredError("FAST2SMS_API_KEY is not set")

    response = httpx.post(
        FAST2SMS_URL,
        headers={"authorization": settings.fast2sms_api_key},
        data={
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": mobile,
        },
        timeout=10.0,
    )
    response.raise_for_status()
    body = response.json()
    if not body.get("return"):
        detail = body.get("message")
        if isinstance(detail, list):
            detail = "; ".join(str(item) for item in detail)
        raise SmsSendError(str(detail) if detail else "Fast2SMS reported failure")
