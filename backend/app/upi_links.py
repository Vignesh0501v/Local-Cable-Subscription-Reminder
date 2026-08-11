from urllib.parse import urlencode

from app.models.settings import AppSettings


def _build_link(scheme: str, upi_id: str, settings: AppSettings, amount: float, note: str) -> str:
    params = {
        "pa": upi_id,
        "pn": settings.merchant_name,
        "am": f"{amount:.2f}",
        "cu": "INR",
        "tn": note,
    }
    return f"{scheme}?{urlencode(params)}"


def build_upi_links(settings: AppSettings, amount: float, note: str) -> dict[str, str | None]:
    """Build per-app UPI deep links. Any app whose UPI ID isn't configured is omitted (None)."""
    links: dict[str, str | None] = {"gpay": None, "phonepe": None, "paytm": None, "generic": None}

    if settings.gpay_upi_id:
        links["gpay"] = _build_link("tez://upi/pay", settings.gpay_upi_id, settings, amount, note)
    if settings.phonepe_upi_id:
        links["phonepe"] = _build_link("phonepe://pay", settings.phonepe_upi_id, settings, amount, note)
    if settings.paytm_upi_id:
        links["paytm"] = _build_link("paytmmp://pay", settings.paytm_upi_id, settings, amount, note)

    fallback_upi_id = settings.gpay_upi_id or settings.phonepe_upi_id or settings.paytm_upi_id
    if fallback_upi_id:
        links["generic"] = _build_link("upi://pay", fallback_upi_id, settings, amount, note)

    return links
