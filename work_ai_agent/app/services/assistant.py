from datetime import UTC, datetime

import requests

from app.core.config import settings
from app.models.ticket import AssistantReply, TelegramMessageIn, TicketDraft, TicketRecord
from app.services.repository import repository

CREATE_COMMANDS = [
    "/ticket",
    "tao ticket",
    "tạo ticket",
    "create ticket",
    "ghi sheet",
    "len sheet",
    "lên sheet",
]

PUSH_COMMANDS = [
    "nhac pic",
    "nhắc pic",
    "push pic",
    "push xu ly",
    "push xử lý",
    "email pic",
]

CONFIRM_COMMANDS = [
    "xac nhan",
    "xác nhận",
    "xac nhan tao ticket",
    "xác nhận tạo ticket",
    "dong y tao ticket",
    "đồng ý tạo ticket",
    "ok tao ticket",
]

CANCEL_COMMANDS = [
    "khong tao ticket",
    "không tạo ticket",
    "huy ticket",
    "hủy ticket",
    "cancel ticket",
]


def normalize_command_text(value: str) -> str:
    return " ".join(value.strip().lower().split())


def is_create_command(message_text: str) -> bool:
    normalized = normalize_command_text(message_text)
    return any(normalized.startswith(command) for command in CREATE_COMMANDS)


def is_push_command(message_text: str) -> bool:
    normalized = normalize_command_text(message_text)
    return any(normalized.startswith(command) for command in PUSH_COMMANDS)


def is_confirm_command(message_text: str) -> bool:
    normalized = normalize_command_text(message_text)
    return normalized in CONFIRM_COMMANDS


def is_cancel_command(message_text: str) -> bool:
    normalized = normalize_command_text(message_text)
    return normalized in CANCEL_COMMANDS


def extract_prefixed_payload(message_text: str, commands: list[str]) -> str:
    normalized = message_text.strip()
    lowered = normalize_command_text(normalized)
    for command in commands:
        if lowered.startswith(command):
            remainder = normalized[len(command):].lstrip(" :,-")
            return remainder
    return ""


def extract_command_payload(message_text: str) -> str:
    return extract_prefixed_payload(message_text, CREATE_COMMANDS)


def extract_push_payload(message_text: str) -> str:
    return extract_prefixed_payload(message_text, PUSH_COMMANDS)


def build_draft_message(draft: TicketDraft) -> str:
    notified_departments = ", ".join(draft.analysis.notified_departments) if draft.analysis.notified_departments else "DVKH"
    return "\n".join(
        [
            "Da phan tich yeu cau. Chua tao ticket tren sheet.",
            f"TC ID du kien: {draft.analysis.testcase_id}",
            f"Cap do: {draft.analysis.severity_level}",
            f"Nhom xu ly: {draft.analysis.catalog_lane}",
            f"PIC chinh: {draft.analysis.assigned_pic}",
            f"Phong ban notify: {notified_departments}",
            f"SLA du kien: {draft.analysis.sla_label}",
            f"SOP xu ly: {draft.analysis.handling_plan}",
            f"Goi y tra loi: {draft.analysis.suggested_reply}",
            "Neu muon tao ticket len sheet, hay nhan: xac nhan tao ticket",
        ]
    )


def build_cancel_message() -> str:
    return "Da huy draft ticket hien tai. Bot se chi tao ticket moi khi ban gui lenh tao ticket hoac xac nhan lai."


def build_missing_draft_confirmation_message() -> str:
    return "Hien khong co draft ticket nao cho chat nay. Hay gui noi dung can xu ly de bot phan tich truoc."


def build_missing_push_context_message() -> str:
    return "Hien chat nay chua co draft hoac ticket gan nhat de nhac PIC. Hay gui noi dung truoc de bot phan tich, hoac tao ticket roi nhan lenh nhac pic."


def build_push_email_sent_message(assigned_pic: str, recipient_email: str, ticket_id: str | None = None) -> str:
    lines = [
        "Da gui email nhac PIC de pushing xu ly nhanh.",
        f"PIC: {assigned_pic}",
        f"Email: {recipient_email}",
    ]
    if ticket_id:
        lines.append(f"Ticket: {ticket_id}")
    else:
        lines.append("Nguon: draft hien tai, chua tao ticket len sheet.")
    lines.append("Neu can tao ticket len sheet, nhan: xac nhan tao ticket")
    return "\n".join(lines)


def build_push_email_failure_message(error_message: str) -> str:
    return f"Chua gui duoc email nhac PIC: {error_message}"


def generate_virtual_assistant_reply(message: TelegramMessageIn, draft: TicketDraft) -> str:
    if settings.llm_api_url and settings.llm_api_key and settings.llm_model:
        try:
            return _generate_llm_reply(message, draft)
        except Exception:
            pass

    return build_draft_message(draft)


def _generate_llm_reply(message: TelegramMessageIn, draft: TicketDraft) -> str:
    system_prompt = (
        "Ban la tro ly ao DVKH noi bo. "
        "Muc tieu la tra loi giong mot tro ly van hanh gioi, ngan gon, ro rang, tu nhien va thuc dung. "
        "CHI duoc phep dung du lieu trong phan PHAN_TICH_DA_XAC_NHAN. "
        "KHONG duoc tu them PIC, phong ban, SLA, testcase, nguyen nhan, deadline hay buoc xu ly neu du lieu khong co san. "
        "Neu thieu du lieu, noi ro la chua co du lieu, khong duoc doan. "
        "Khong viet thanh bai van dai, khong danh so 1 2 3, khong lap lai nguyen van input. "
        "Khong noi rang da tao ticket, vi he thong chua tao ticket neu chua co lenh hoac xac nhan. "
        "Tra loi bang tieng Viet tu nhien, xung ho phu hop van canh noi bo. "
        "Bat buoc theo dung format 5 dong sau, khong them dong nao khac: \n"
        "Tom tat: <1-2 cau ngan ve tinh huong va huong xu ly>\n"
        "Xu ly: <neu ro SOP thi tom tat 1 cau, neu khong thi ghi chua co du lieu>\n"
        "Dieu phoi: PIC <...>; Notify <...>\n"
        "SLA: <...>\n"
        "Tra loi shop: <1 cau goi y tra loi de gui lai>; Neu can ghi sheet, nhan: xac nhan tao ticket"
    )
    user_prompt = "\n".join(
        [
            "TIN_NHAN_GOC:",
            message.message_text,
            "",
            "PHAN_TICH_DA_XAC_NHAN:",
            f"- TC ID: {draft.analysis.testcase_id}",
            f"- Cap do: {draft.analysis.severity_level}",
            f"- Nhom xu ly: {draft.analysis.catalog_lane}",
            f"- PIC: {draft.analysis.assigned_pic}",
            f"- Phong ban notify: {', '.join(draft.analysis.notified_departments) if draft.analysis.notified_departments else 'chua co du lieu'}",
            f"- SLA: {draft.analysis.sla_label}",
            f"- SOP: {draft.analysis.handling_plan or 'chua co du lieu'}",
            f"- Goi y tra loi: {draft.analysis.suggested_reply or 'chua co du lieu'}",
            "",
            "YEU_CAU_RANG_BUOC:",
            "- Khong tu them thong tin ngoai PHAN_TICH_DA_XAC_NHAN.",
            "- Neu khong chac, ghi chua co du lieu.",
            "- Tra loi dung 5 dong theo format da cho.",
        ]
    )

    response = requests.post(
        settings.llm_api_url,
        headers={
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
        },
        timeout=settings.llm_timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()
    return payload["choices"][0]["message"]["content"].strip()


def build_draft(message: TelegramMessageIn, analysis) -> TicketDraft:
    return TicketDraft(
        chat_id=message.chat_id,
        sender_name=message.sender_name,
        forwarded_from=message.forwarded_from,
        message_text=message.message_text,
        analysis=analysis,
        created_at=message.received_at or datetime.now(UTC).replace(tzinfo=None),
    )


def build_confirmation_message(ticket: TicketRecord) -> str:
    return "\n".join(
        [
            f"Da tao ticket {ticket.ticket_id} len sheet.",
            f"TC ID: {ticket.testcase_id}",
            f"Cap do: {ticket.severity_level}",
            f"PIC: {ticket.assigned_pic}",
            f"SLA: {ticket.sla_label}",
            f"SOP: {ticket.handling_plan}",
            f"Goi y tra loi: {ticket.suggested_reply}",
        ]
    )