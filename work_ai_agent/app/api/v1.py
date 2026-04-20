from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from app.agents.orchestrator import orchestrator
from app.core.config import settings
from app.models.ticket import AgentStatus, DashboardSummary, TelegramMessageIn, TelegramUpdate, TelegramWebhookResponse, TicketEmailRequest, TicketEmailResponse, TicketProcessResponse
from app.services.dashboard import build_dashboard_summary
from app.services.email_service import EmailConfigurationError, EmailDeliveryError, send_ticket_email
from app.services.repository import repository
from app.services.telegram_updates import process_telegram_update

router = APIRouter()


def _process_telegram_update(payload: TelegramUpdate) -> None:
    process_telegram_update(payload)


@router.get("/agent", response_model=AgentStatus)
def agent_home():
    return AgentStatus(
        app_name=settings.app_name,
        integrations={
            "telegram": bool(settings.telegram_bot_token),
            "google_sheet": bool(settings.google_sheet_id),
            "email": bool(settings.smtp_host and settings.smtp_from_email),
        },
        default_sheet_id=settings.google_sheet_id,
        default_worksheet=settings.google_worksheet_name,
    )


@router.post("/telegram/process", response_model=TicketProcessResponse)
def process_telegram_message(payload: TelegramMessageIn):
    return orchestrator.process_telegram_message(payload)


@router.post("/telegram/webhook", response_model=TelegramWebhookResponse)
def telegram_webhook(
    background_tasks: BackgroundTasks,
    payload: TelegramUpdate,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    if settings.telegram_webhook_secret and x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=403, detail='Telegram webhook secret không hợp lệ.')

    if not repository.reserve_telegram_update(payload.update_id):
        return TelegramWebhookResponse(
            message='Update Telegram này đã được nhận trước đó.',
            delivery_status='duplicate-update-skipped',
        )

    background_tasks.add_task(_process_telegram_update, payload)
    return TelegramWebhookResponse(
        message='Đã nhận message Telegram, đang xử lý nền.',
        delivery_status='processing-in-background',
    )


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    ticket = repository.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy ticket {ticket_id} trong bộ nhớ hệ thống.")
    return ticket


@router.get("/tickets")
def list_tickets(limit: int = 10):
    safe_limit = max(1, min(limit, 100))
    return repository.list_all()[:safe_limit]


@router.post("/tickets/{ticket_id}/send-email", response_model=TicketEmailResponse)
def send_ticket_notification(ticket_id: str, payload: TicketEmailRequest):
    ticket = repository.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy ticket {ticket_id} trong bộ nhớ hệ thống.")
    try:
        recipient_email = payload.recipient_email or ticket.email_recipient or settings.default_notification_email
        subject, _ = send_ticket_email(ticket, recipient_email, payload.additional_message)
        return TicketEmailResponse(ticket_id=ticket_id, recipient_email=recipient_email, subject=subject)
    except EmailConfigurationError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except EmailDeliveryError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary():
    return build_dashboard_summary(repository.list_all())
