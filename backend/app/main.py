from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.collector.router import router as collector_router
from app.customers.router import router as customers_router
from app.notifications.router import router as notifications_router
from app.notifications.scheduler import start_scheduler, stop_scheduler
from app.operator.router import router as operator_router
from app.plans.router import router as plans_router
from app.public.router import router as public_router
from app.reports.router import router as reports_router
from app.staff.router import router as staff_router
from app.upi_settings.router import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Local Cable Subscription Reminder & Payment Management System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(plans_router)
app.include_router(customers_router)
app.include_router(settings_router)
app.include_router(public_router)
app.include_router(collector_router)
app.include_router(operator_router)
app.include_router(staff_router)
app.include_router(admin_router)
app.include_router(notifications_router)
app.include_router(reports_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
