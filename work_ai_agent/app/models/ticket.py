from datetime import datetime

from pydantic import BaseModel, Field


class TelegramUser(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None


class TelegramChat(BaseModel):
    id: int
    type: str
    title: str | None = None
    username: str | None = None


class TelegramIncomingMessage(BaseModel):
    message_id: int
    date: int
    chat: TelegramChat
    from_user: TelegramUser | None = Field(default=None, alias="from")
    text: str | None = None
    caption: str | None = None
    forward_sender_name: str | None = None
    forward_from_chat: TelegramChat | None = None

    model_config = {"populate_by_name": True}


class TelegramUpdate(BaseModel):
    update_id: int
    message: TelegramIncomingMessage | None = None
    edited_message: TelegramIncomingMessage | None = None


class TelegramWebhookResponse(BaseModel):
    ok: bool = True
    message: str
    ticket_id: str | None = None
    delivery_status: str | None = None
    warning: str | None = None


class TicketDraft(BaseModel):
    chat_id: str
    sender_name: str
    forwarded_from: str | None = None
    message_text: str
    analysis: TicketAnalysis
    created_at: datetime


class AssistantReply(BaseModel):
    mode: str
    message: str
    ticket: TicketRecord | None = None
    draft: TicketDraft | None = None
    sheet_sync_status: str | None = None


class TelegramMessageIn(BaseModel):
    chat_id: str = Field(..., description="Telegram chat or group id")
    sender_name: str = Field(..., description="Người forward hoặc gửi tin nhắn")
    message_text: str = Field(..., description="Nội dung khách hàng gửi")
    forwarded_from: str | None = Field(default=None, description="Nguồn gốc tin nhắn nếu có")
    received_at: datetime | None = Field(default=None, description="Thời điểm bot nhận tin nhắn")


class TicketAnalysis(BaseModel):
    testcase_id: str
    severity_level: str
    catalog_lane: str
    category: str
    priority: str
    primary_department: str
    assigned_pic: str
    notified_departments: list[str] = Field(default_factory=list)
    sla_label: str
    suggested_reply: str
    handling_plan: str


class TicketRecord(BaseModel):
    ticket_id: str
    testcase_id: str
    source: str = "telegram"
    service: str = "Catalog"
    team: str = "CS"
    severity_level: str
    priority: str
    market: str
    customer_message: str
    catalog_lane: str
    category: str
    primary_department: str
    assigned_pic: str
    notified_departments: list[str] = Field(default_factory=list)
    status: str = "Tiếp nhận"
    started_at: datetime
    due_at: datetime
    sla_label: str
    reminder_schedule: list[datetime] = Field(default_factory=list)
    suggested_reply: str
    handling_plan: str
    email_recipient: str = ""
    metadata: dict[str, str] = Field(default_factory=dict)


class TicketProcessResponse(BaseModel):
    ticket: TicketRecord
    sheet_row: dict[str, str]
    sheet_sync_status: str


class TicketEmailRequest(BaseModel):
    recipient_email: str | None = None
    additional_message: str | None = None


class TicketEmailResponse(BaseModel):
    ticket_id: str
    recipient_email: str
    subject: str
    status: str = "sent"


class DashboardSummary(BaseModel):
    total_tickets: int
    open_tickets: int
    overdue_tickets: int
    due_reminders: int
    by_lane: dict[str, int] = Field(default_factory=dict)


class AgentStatus(BaseModel):
    app_name: str
    integrations: dict[str, bool]
    default_sheet_id: str
    default_worksheet: str
