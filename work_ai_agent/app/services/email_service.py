import smtplib
from email.message import EmailMessage

from app.core.config import settings
from app.models.ticket import TicketDraft, TicketRecord


class EmailConfigurationError(Exception):
    pass


class EmailDeliveryError(Exception):
    pass


def build_email_subject(ticket: TicketRecord) -> str:
    return f"[CS Agent] {ticket.ticket_id} - {ticket.catalog_lane}"


def build_email_body(ticket: TicketRecord, additional_message: str | None = None) -> str:
    lines = [
        f"Ticket ID: {ticket.ticket_id}",
        f"Service: {ticket.service}",
        f"Market: {ticket.market}",
        f"Lane: {ticket.catalog_lane}",
        f"PIC: {ticket.assigned_pic}",
        f"SLA deadline: {ticket.due_at.isoformat()}",
        "",
        "Nội dung khách hàng:",
        ticket.customer_message,
        "",
        "Phương án xử lý đề xuất:",
        ticket.handling_plan,
        "",
        "Câu trả lời gợi ý:",
        ticket.suggested_reply,
    ]
    if additional_message:
        lines.extend(["", "Ghi chú thêm:", additional_message])
    return '\n'.join(lines)


def build_push_email_subject(ticket_id: str | None, lane: str) -> str:
    prefix = ticket_id or "Draft"
    return f"[CS Agent][Push] {prefix} - {lane}"


def build_push_email_body_for_ticket(ticket: TicketRecord, additional_message: str | None = None) -> str:
    lines = [
        f"PIC phụ trách: {ticket.assigned_pic}",
        f"Ticket ID: {ticket.ticket_id}",
        f"Lane: {ticket.catalog_lane}",
        f"Mức độ: {ticket.severity_level}",
        f"SLA: {ticket.sla_label}",
        "",
        "Yêu cầu pushing xử lý nhanh cho case sau:",
        ticket.customer_message,
        "",
        "Hướng xử lý hiện tại:",
        ticket.handling_plan,
    ]
    if additional_message:
        lines.extend(["", "Lý do pushing bổ sung:", additional_message])
    return "\n".join(lines)


def build_push_email_body_for_draft(draft: TicketDraft, additional_message: str | None = None) -> str:
    lines = [
        f"PIC phụ trách: {draft.analysis.assigned_pic}",
        "Nguồn: draft Telegram, chưa tạo ticket lên sheet.",
        f"Lane: {draft.analysis.catalog_lane}",
        f"Mức độ: {draft.analysis.severity_level}",
        f"SLA: {draft.analysis.sla_label}",
        "",
        "Yêu cầu pushing xử lý nhanh cho nội dung sau:",
        draft.message_text,
        "",
        "Hướng xử lý hiện tại:",
        draft.analysis.handling_plan,
    ]
    if additional_message:
        lines.extend(["", "Lý do pushing bổ sung:", additional_message])
    return "\n".join(lines)


def _send_email(recipient_email: str, subject: str, body: str) -> tuple[str, str]:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise EmailConfigurationError(
            "SMTP chưa được cấu hình. Hãy set SMTP_HOST, SMTP_FROM_EMAIL, SMTP_USERNAME, SMTP_PASSWORD."
        )

    message = EmailMessage()
    message['From'] = settings.smtp_from_email
    message['To'] = recipient_email
    message['Subject'] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception as error:
        raise EmailDeliveryError(f"Không gửi được email: {error}") from error

    return subject, body


def send_ticket_email(ticket: TicketRecord, recipient_email: str, additional_message: str | None = None) -> tuple[str, str]:
    subject = build_email_subject(ticket)
    body = build_email_body(ticket, additional_message)
    return _send_email(recipient_email, subject, body)


def send_push_reminder_for_ticket(ticket: TicketRecord, recipient_email: str, additional_message: str | None = None) -> tuple[str, str]:
    subject = build_push_email_subject(ticket.ticket_id, ticket.catalog_lane)
    body = build_push_email_body_for_ticket(ticket, additional_message)
    return _send_email(recipient_email, subject, body)


def send_push_reminder_for_draft(draft: TicketDraft, recipient_email: str, additional_message: str | None = None) -> tuple[str, str]:
    subject = build_push_email_subject(None, draft.analysis.catalog_lane)
    body = build_push_email_body_for_draft(draft, additional_message)
    return _send_email(recipient_email, subject, body)
