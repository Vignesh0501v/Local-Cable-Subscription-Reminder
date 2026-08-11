from pydantic import BaseModel, ConfigDict, Field


class PlanBase(BaseModel):
    plan_name: str = Field(min_length=1, max_length=120)
    price: float = Field(gt=0)
    description: str | None = Field(default=None, max_length=500)


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    plan_name: str | None = Field(default=None, min_length=1, max_length=120)
    price: float | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=500)


class PlanOut(PlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
