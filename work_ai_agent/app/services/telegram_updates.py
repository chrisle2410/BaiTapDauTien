from app.agents.orchestrator import orchestrator
from app.core.config import settings
from app.models.ticket import TelegramMessageIn, TelegramUpdate
from app.services.assistant import build_cancel_message, build_confirmation_message, build_missing_draft_confirmation_message, build_missing_push_context_message, build_push_email_failure_message, build_push_email_sent_message, extract_command_payload, extract_push_payload, generate_virtual_assistant_reply, is_cancel_command, is_confirm_command, is_create_command, is_push_command
from app.services.email_service import EmailConfigurationError, EmailDeliveryError, send_push_reminder_for_draft, send_push_reminder_for_ticket
from app.services.repository import repository
from app.services.telegram import TelegramDeliveryError, TelegramUpdateError, extract_message_from_update, send_telegram_text


def process_telegram_update(payload: TelegramUpdate) -> None:
    try:
        telegram_message = extract_message_from_update(payload)
        outgoing_message = None

        if is_cancel_command(telegram_message.message_text):
            repository.delete_draft(telegram_message.chat_id)
            outgoing_message = build_cancel_message()
        elif is_confirm_command(telegram_message.message_text):
            draft = repository.get_draft(telegram_message.chat_id)
            if draft is None:
                outgoing_message = build_missing_draft_confirmation_message()
            else:
                result = orchestrator.create_ticket_from_message(
                    TelegramMessageIn(
                        chat_id=draft.chat_id,
                        sender_name=draft.sender_name,
                        message_text=draft.message_text,
                        forwarded_from=draft.forwarded_from,
                        received_at=draft.created_at,
                    )
                )
                repository.delete_draft(telegram_message.chat_id)
                outgoing_message = build_confirmation_message(result.ticket)
        elif is_create_command(telegram_message.message_text):
            command_payload = extract_command_payload(telegram_message.message_text)
            if command_payload:
                result = orchestrator.create_ticket_from_message(
                    TelegramMessageIn(
                        chat_id=telegram_message.chat_id,
                        sender_name=telegram_message.sender_name,
                        message_text=command_payload,
                        forwarded_from=telegram_message.forwarded_from,
                        received_at=telegram_message.received_at,
                    )
                )
                outgoing_message = build_confirmation_message(result.ticket)
            else:
                draft = repository.get_draft(telegram_message.chat_id)
                if draft is None:
                    outgoing_message = "Hay gui noi dung can xu ly kem lenh tao ticket, hoac gui noi dung truoc de bot phan tich roi xac nhan sau."
                else:
                    result = orchestrator.create_ticket_from_message(
                        TelegramMessageIn(
                            chat_id=draft.chat_id,
                            sender_name=draft.sender_name,
                            message_text=draft.message_text,
                            forwarded_from=draft.forwarded_from,
                            received_at=draft.created_at,
                        )
                    )
                    repository.delete_draft(telegram_message.chat_id)
                    outgoing_message = build_confirmation_message(result.ticket)
        elif is_push_command(telegram_message.message_text):
            push_payload = extract_push_payload(telegram_message.message_text)
            draft = repository.get_draft(telegram_message.chat_id)
            latest_ticket = None if draft is not None else repository.get_latest_ticket_by_chat_id(telegram_message.chat_id)

            if draft is not None:
                recipient_email = settings.pic_email_map.get(draft.analysis.assigned_pic, settings.default_notification_email)
                try:
                    send_push_reminder_for_draft(draft, recipient_email, push_payload or None)
                    outgoing_message = build_push_email_sent_message(draft.analysis.assigned_pic, recipient_email)
                except (EmailConfigurationError, EmailDeliveryError) as error:
                    outgoing_message = build_push_email_failure_message(str(error))
            elif latest_ticket is not None:
                recipient_email = latest_ticket.email_recipient or settings.default_notification_email
                try:
                    send_push_reminder_for_ticket(latest_ticket, recipient_email, push_payload or None)
                    outgoing_message = build_push_email_sent_message(
                        latest_ticket.assigned_pic,
                        recipient_email,
                        ticket_id=latest_ticket.ticket_id,
                    )
                except (EmailConfigurationError, EmailDeliveryError) as error:
                    outgoing_message = build_push_email_failure_message(str(error))
            else:
                outgoing_message = build_missing_push_context_message()
        else:
            draft = orchestrator.build_draft(telegram_message)
            repository.save_draft(draft)
            outgoing_message = generate_virtual_assistant_reply(telegram_message, draft)

        send_telegram_text(telegram_message.chat_id, outgoing_message)
    except (TelegramUpdateError, TelegramDeliveryError):
        return