import json
from pathlib import Path

import gspread
from gspread.exceptions import WorksheetNotFound
from google.oauth2.service_account import Credentials

from app.core.config import settings
from app.models.ticket import TicketRecord


class GoogleSheetsConfigurationError(Exception):
    pass


SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def build_sheet_row(ticket: TicketRecord) -> dict[str, str]:
    return {
        "ticket_id": ticket.ticket_id,
        "testcase_id": ticket.testcase_id,
        "service": ticket.service,
        "team": ticket.team,
        "severity_level": ticket.severity_level,
        "priority": ticket.priority,
        "market": ticket.market,
        "catalog_lane": ticket.catalog_lane,
        "category": ticket.category,
        "primary_department": ticket.primary_department,
        "assigned_pic": ticket.assigned_pic,
        "notified_departments": json.dumps(ticket.notified_departments, ensure_ascii=False),
        "status": ticket.status,
        "started_at": ticket.started_at.isoformat(),
        "due_at": ticket.due_at.isoformat(),
        "sla_label": ticket.sla_label,
        "reminder_schedule": json.dumps([item.isoformat() for item in ticket.reminder_schedule]),
        "customer_message": ticket.customer_message,
        "suggested_reply": ticket.suggested_reply,
        "handling_plan": ticket.handling_plan,
        "email_recipient": ticket.email_recipient,
    }


def append_ticket_row(ticket: TicketRecord) -> str:
    if not settings.google_sheet_id:
        raise GoogleSheetsConfigurationError(
            "Google Sheet chưa được cấu hình. Hãy set GOOGLE_SHEET_ID và GOOGLE_WORKSHEET_NAME."
        )

    if not settings.google_service_account_json:
        raise GoogleSheetsConfigurationError(
            "Sheet hiện đã có thể đọc công khai, nhưng để bot ghi ticket tự động bạn vẫn cần set GOOGLE_SERVICE_ACCOUNT_JSON cho Google Sheets API."
        )

    client = _build_gspread_client()
    spreadsheet = client.open_by_key(settings.google_sheet_id)
    row_data = build_sheet_row(ticket)
    worksheet = _get_or_create_worksheet(spreadsheet, settings.google_worksheet_name, list(row_data.keys()))
    headers = worksheet.row_values(1)
    if not headers:
        headers = list(row_data.keys())
        worksheet.append_row(headers)

    ordered_row = [row_data.get(header, "") for header in headers]
    worksheet.append_row(ordered_row, value_input_option="USER_ENTERED")
    return "google-sheet-appended"


def _build_gspread_client() -> gspread.Client:
    raw_value = settings.google_service_account_json.strip()
    potential_path = Path(raw_value)

    if potential_path.exists():
        credentials = Credentials.from_service_account_file(potential_path, scopes=SCOPES)
    else:
        try:
            info = json.loads(raw_value)
        except json.JSONDecodeError as error:
            raise GoogleSheetsConfigurationError(
                "GOOGLE_SERVICE_ACCOUNT_JSON phải là đường dẫn file JSON hoặc nội dung JSON hợp lệ của service account."
            ) from error
        credentials = Credentials.from_service_account_info(info, scopes=SCOPES)

    return gspread.authorize(credentials)


def _get_or_create_worksheet(
    spreadsheet: gspread.Spreadsheet,
    worksheet_name: str,
    headers: list[str],
) -> gspread.Worksheet:
    try:
        return spreadsheet.worksheet(worksheet_name)
    except WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=worksheet_name, rows=1000, cols=max(len(headers), 20))
        worksheet.append_row(headers)
        return worksheet
