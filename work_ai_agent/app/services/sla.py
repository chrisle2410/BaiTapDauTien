from datetime import datetime, timedelta

DEFAULT_SLA_HOURS = 24
REMINDER_INTERVAL_HOURS = 6


def build_due_at(started_at: datetime, sla_minutes: int | None = None) -> datetime:
    effective_sla_minutes = sla_minutes or DEFAULT_SLA_HOURS * 60
    return started_at + timedelta(minutes=effective_sla_minutes)


def build_reminder_schedule(started_at: datetime, due_at: datetime) -> list[datetime]:
    reminders = []
    current = started_at + timedelta(hours=REMINDER_INTERVAL_HOURS)
    while current < due_at:
        reminders.append(current)
        current += timedelta(hours=REMINDER_INTERVAL_HOURS)
    return reminders
