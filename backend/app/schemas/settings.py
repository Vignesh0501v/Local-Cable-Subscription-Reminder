from pydantic import BaseModel, ConfigDict, Field


class SettingsUpdate(BaseModel):
    gpay_upi_id: str | None = Field(default=None, max_length=120)
    phonepe_upi_id: str | None = Field(default=None, max_length=120)
    paytm_upi_id: str | None = Field(default=None, max_length=120)
    merchant_name: str = Field(min_length=1, max_length=120)
    merchant_phone: str = Field(min_length=10, max_length=20)
    payment_note: str | None = Field(default=None, max_length=200)


class SettingsOut(SettingsUpdate):
    model_config = ConfigDict(from_attributes=True)

    id: int
