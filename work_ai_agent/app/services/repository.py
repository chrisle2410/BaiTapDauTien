import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from app.models.ticket import TicketDraft, TicketRecord


class SQLiteTicketRepository:
    def __init__(self, database_path: str) -> None:
        self._database_path = Path(database_path)
        if not self._database_path.is_absolute():
            self._database_path = Path.cwd() / self._database_path
        self._database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS tickets (
                    ticket_id TEXT PRIMARY KEY,
                    started_at TEXT NOT NULL,
                    due_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    severity_level TEXT NOT NULL,
                    catalog_lane TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS ticket_drafts (
                    chat_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS processed_telegram_updates (
                    update_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL
                )
                """
            )

    def add(self, ticket: TicketRecord) -> TicketRecord:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO tickets (
                    ticket_id,
                    started_at,
                    due_at,
                    status,
                    severity_level,
                    catalog_lane,
                    payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ticket.ticket_id,
                    ticket.started_at.isoformat(),
                    ticket.due_at.isoformat(),
                    ticket.status,
                    ticket.severity_level,
                    ticket.catalog_lane,
                    ticket.model_dump_json(),
                ),
            )
        return ticket

    def get(self, ticket_id: str) -> TicketRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM tickets WHERE ticket_id = ?",
                (ticket_id,),
            ).fetchone()

        if row is None:
            return None
        return TicketRecord.model_validate_json(row["payload_json"])

    def list_all(self) -> list[TicketRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload_json FROM tickets ORDER BY started_at DESC, ticket_id DESC"
            ).fetchall()
        return [TicketRecord.model_validate_json(row["payload_json"]) for row in rows]

    def get_latest_ticket_by_chat_id(self, chat_id: str) -> TicketRecord | None:
        for ticket in self.list_all():
            if ticket.metadata.get("chat_id") == chat_id:
                return ticket
        return None

    def save_draft(self, draft: TicketDraft) -> TicketDraft:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO ticket_drafts (
                    chat_id,
                    created_at,
                    payload_json
                ) VALUES (?, ?, ?)
                """,
                (
                    draft.chat_id,
                    draft.created_at.isoformat(),
                    draft.model_dump_json(),
                ),
            )
        return draft

    def get_draft(self, chat_id: str) -> TicketDraft | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM ticket_drafts WHERE chat_id = ?",
                (chat_id,),
            ).fetchone()

        if row is None:
            return None
        return TicketDraft.model_validate_json(row["payload_json"])

    def delete_draft(self, chat_id: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM ticket_drafts WHERE chat_id = ?", (chat_id,))

    def reserve_telegram_update(self, update_id: int | str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO processed_telegram_updates (
                    update_id,
                    created_at
                ) VALUES (?, ?)
                """,
                (str(update_id), datetime.now(UTC).replace(tzinfo=None).isoformat()),
            )
        return cursor.rowcount == 1


repository = SQLiteTicketRepository(settings.database_path)
