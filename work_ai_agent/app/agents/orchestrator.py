from datetime import UTC, datetime

from app.core.config import settings
from app.models.ticket import TelegramMessageIn, TicketAnalysis, TicketDraft, TicketProcessResponse, TicketRecord
from app.services.catalog_router import route_catalog_request
from app.services.google_sheets import append_ticket_row, build_sheet_row
from app.services.repository import repository
from app.services.sla import build_due_at, build_reminder_schedule
from app.services.telegram import normalize_telegram_message
from app.services.ticket_id import generate_ticket_id


class WorkAgentOrchestrator:
    def process_telegram_message(self, payload: TelegramMessageIn) -> TicketProcessResponse:
        normalized_message = normalize_telegram_message(payload)
        return self.create_ticket_from_message(normalized_message)

    def create_ticket_from_message(self, message: TelegramMessageIn) -> TicketProcessResponse:
        ticket = self.build_ticket(message)
        repository.add(ticket)
        sheet_row = build_sheet_row(ticket)

        try:
            sheet_sync_status = append_ticket_row(ticket)
        except Exception as error:
            sheet_sync_status = str(error)

        return TicketProcessResponse(ticket=ticket, sheet_row=sheet_row, sheet_sync_status=sheet_sync_status)

    def build_ticket(self, message: TelegramMessageIn) -> TicketRecord:
        started_at = message.received_at or datetime.now(UTC).replace(tzinfo=None)
        route = route_catalog_request(message.message_text)
        due_at = build_due_at(started_at, route.sla_minutes)
        reminders = build_reminder_schedule(started_at, due_at)
        recipient_email = settings.pic_email_map.get(route.assigned_pic, settings.default_notification_email)

        return TicketRecord(
            ticket_id=generate_ticket_id(started_at),
            testcase_id=route.testcase_id,
            team=settings.team_name,
            severity_level=route.severity_level,
            priority=route.priority,
            market=route.market,
            customer_message=message.message_text,
            catalog_lane=route.lane,
            category=route.category,
            primary_department=route.primary_department,
            assigned_pic=route.assigned_pic,
            notified_departments=route.notified_departments,
            started_at=started_at,
            due_at=due_at,
            sla_label=route.sla_label,
            reminder_schedule=reminders,
            suggested_reply=route.suggested_reply,
            handling_plan=route.handling_plan,
            email_recipient=recipient_email,
            metadata={
                "chat_id": message.chat_id,
                "sender_name": message.sender_name,
                "forwarded_from": message.forwarded_from or "",
            },
        )

    def build_draft(self, payload: TelegramMessageIn) -> TicketDraft:
        normalized_message = normalize_telegram_message(payload)
        return TicketDraft(
            chat_id=normalized_message.chat_id,
            sender_name=normalized_message.sender_name,
            forwarded_from=normalized_message.forwarded_from,
            message_text=normalized_message.message_text,
            analysis=self.analyze(normalized_message.message_text),
            created_at=normalized_message.received_at or datetime.now(UTC).replace(tzinfo=None),
        )

    def analyze(self, message_text: str) -> TicketAnalysis:
        route = route_catalog_request(message_text)
        return TicketAnalysis(
            testcase_id=route.testcase_id,
            severity_level=route.severity_level,
            catalog_lane=route.lane,
            category=route.category,
            priority=route.priority,
            primary_department=route.primary_department,
            assigned_pic=route.assigned_pic,
            notified_departments=route.notified_departments,
            sla_label=route.sla_label,
            suggested_reply=route.suggested_reply,
            handling_plan=route.handling_plan,
        )


orchestrator = WorkAgentOrchestrator()
