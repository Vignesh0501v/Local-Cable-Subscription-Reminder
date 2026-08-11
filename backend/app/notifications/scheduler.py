import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import SessionLocal
from app.notifications.service import send_monthly_reminders

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def _run_monthly_reminders_job() -> None:
    db = SessionLocal()
    try:
        results = send_monthly_reminders(db)
        logger.info("Monthly reminders sent to %d active customers", len(results))
    finally:
        db.close()


def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(
            _run_monthly_reminders_job,
            CronTrigger(day=15, hour=9, minute=0),
            id="monthly_reminders",
            replace_existing=True,
        )
        scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
