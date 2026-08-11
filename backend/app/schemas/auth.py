from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import UserRole, UserStatus


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    phone: str
    role: UserRole
    status: UserStatus
