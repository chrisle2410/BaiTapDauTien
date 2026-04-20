import json
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "CS Work AI Agent")
    app_env: str = os.getenv("APP_ENV", "development")
    secret_key: str = os.getenv("SECRET_KEY", "changeme")
    team_name: str = os.getenv("TEAM_NAME", "CS")
    database_path: str = os.getenv("DATABASE_PATH", os.path.join("data", "tickets.db"))
    llm_api_url: str = os.getenv("LLM_API_URL", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "")
    llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "120"))
    telegram_bot_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_webhook_secret: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
    telegram_polling_enabled: bool = os.getenv("TELEGRAM_POLLING_ENABLED", "false").lower() == "true"
    telegram_polling_timeout_seconds: int = int(os.getenv("TELEGRAM_POLLING_TIMEOUT_SECONDS", "30"))
    google_sheet_id: str = os.getenv("GOOGLE_SHEET_ID", "1cA8xbGnzB5v_gaDa8CR9O8n9BC6bG8aj5ADsJIlvmhQ")
    google_worksheet_name: str = os.getenv("GOOGLE_WORKSHEET_NAME", "Ticket")
    google_service_account_json: str = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USERNAME", ""))
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    default_notification_email: str = os.getenv("DEFAULT_NOTIFICATION_EMAIL", "chris.leqc2430@gmail.com")
    pic_email_map: dict[str, str] = field(default_factory=dict)


def _build_settings() -> Settings:
    try:
        pic_email_map = json.loads(os.getenv("PIC_EMAIL_MAP", "{}"))
        if not isinstance(pic_email_map, dict):
            pic_email_map = {}
    except json.JSONDecodeError:
        pic_email_map = {}

    return Settings(pic_email_map=pic_email_map)


settings = _build_settings()
