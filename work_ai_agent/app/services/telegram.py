from datetime import datetime, timezone

import requests

from app.core.config import settings
from app.models.ticket import TelegramMessageIn, TelegramUpdate, TicketRecord


class TelegramUpdateError(Exception):
    pass


class TelegramDeliveryError(Exception):
    pass


def normalize_telegram_message(payload: TelegramMessageIn) -> TelegramMessageIn:
    normalized_text = ' '.join(payload.message_text.strip().split())
    return TelegramMessageIn(
        chat_id=payload.chat_id,
        sender_name=payload.sender_name,
        message_text=normalized_text,
        forwarded_from=payload.forwarded_from,
        received_at=payload.received_at,
    )


def extract_message_from_update(update: TelegramUpdate) -> TelegramMessageIn:
    message = update.message or update.edited_message
    if message is None:
        raise TelegramUpdateError('Update Telegram không chứa message hợp lệ.')

    message_text = (message.text or message.caption or '').strip()
    if not message_text:
        raise TelegramUpdateError('Bot chỉ xử lý tin nhắn text hoặc caption.')

    sender_parts = []
    if message.from_user:
        if message.from_user.first_name:
            sender_parts.append(message.from_user.first_name)
        if message.from_user.last_name:
            sender_parts.append(message.from_user.last_name)
    sender_name = ' '.join(sender_parts).strip() or (message.from_user.username if message.from_user and message.from_user.username else 'Telegram User')

    forwarded_from = message.forward_sender_name
    if not forwarded_from and message.forward_from_chat:
        forwarded_from = message.forward_from_chat.title or message.forward_from_chat.username

    return TelegramMessageIn(
        chat_id=str(message.chat.id),
        sender_name=sender_name,
        message_text=message_text,
        forwarded_from=forwarded_from,
        received_at=datetime.fromtimestamp(message.date, tz=timezone.utc).replace(tzinfo=None),
    )


def build_ticket_acknowledgement(ticket: TicketRecord) -> str:
    notified_departments = ", ".join(ticket.notified_departments) if ticket.notified_departments else "DVKH"
    due_label = ticket.due_at.strftime("%Y-%m-%d %H:%M:%S")
    return "\n".join(
        [
            f"Da tao ticket {ticket.ticket_id}",
            f"TC ID: {ticket.testcase_id}",
            f"Cap do: {ticket.severity_level}",
            f"Nhom xu ly: {ticket.catalog_lane}",
            f"PIC chinh: {ticket.assigned_pic}",
            f"Phong ban notify: {notified_departments}",
            f"SLA: {ticket.sla_label}",
            f"Deadline du kien: {due_label}",
            f"SOP xu ly: {ticket.handling_plan}",
            f"Goi y tra loi: {ticket.suggested_reply}",
        ]
    )


def send_telegram_text(chat_id: str, text: str) -> str:
    if not settings.telegram_bot_token:
        return 'telegram-token-not-configured'

    api_url = f'https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage'
    response = requests.post(
        api_url,
        json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
        timeout=15,
    )
    if not response.ok:
        raise TelegramDeliveryError(
            f'Không gửi được phản hồi Telegram: HTTP {response.status_code} - {response.text}'
        )
    return 'telegram-message-sent'
