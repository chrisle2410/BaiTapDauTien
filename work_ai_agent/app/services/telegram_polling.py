from __future__ import annotations

import threading

import requests

from app.core.config import settings
from app.models.ticket import TelegramUpdate
from app.services.telegram_updates import process_telegram_update


class TelegramPollingWorker:
    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._offset: int | None = None

    def start(self) -> None:
        if not settings.telegram_polling_enabled or not settings.telegram_bot_token:
            return
        if self._thread is not None and self._thread.is_alive():
            return

        self._clear_webhook()
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="telegram-polling-worker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                updates = self._get_updates()
                for raw_update in updates:
                    update = TelegramUpdate.model_validate(raw_update)
                    process_telegram_update(update)
                    self._offset = update.update_id + 1
            except Exception:
                if self._stop_event.wait(5):
                    return

    def _get_updates(self) -> list[dict]:
        response = requests.get(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/getUpdates",
            params={
                "offset": self._offset,
                "timeout": settings.telegram_polling_timeout_seconds,
                "allowed_updates": ["message", "edited_message"],
            },
            timeout=settings.telegram_polling_timeout_seconds + 10,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("ok"):
            return []
        return payload.get("result", [])

    def _clear_webhook(self) -> None:
        try:
            requests.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/deleteWebhook",
                json={"drop_pending_updates": False},
                timeout=15,
            ).raise_for_status()
        except requests.RequestException:
            return


telegram_polling_worker = TelegramPollingWorker()