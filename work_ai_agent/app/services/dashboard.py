from datetime import datetime

from app.models.ticket import DashboardSummary, TicketRecord


def build_dashboard_summary(tickets: list[TicketRecord], now: datetime | None = None) -> DashboardSummary:
    current = now or datetime.utcnow()
    by_lane: dict[str, int] = {}
    open_tickets = 0
    overdue_tickets = 0
    due_reminders = 0

    for ticket in tickets:
        by_lane[ticket.catalog_lane] = by_lane.get(ticket.catalog_lane, 0) + 1
        if ticket.status != "Hoàn thành":
            open_tickets += 1
        if ticket.status != "Hoàn thành" and ticket.due_at < current:
            overdue_tickets += 1
        if ticket.status != "Hoàn thành" and any(reminder <= current for reminder in ticket.reminder_schedule):
            due_reminders += 1

    return DashboardSummary(
        total_tickets=len(tickets),
        open_tickets=open_tickets,
        overdue_tickets=overdue_tickets,
        due_reminders=due_reminders,
        by_lane=by_lane,
    )
