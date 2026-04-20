from fastapi import FastAPI

from app.api.v1 import router as api_router
from app.core.config import settings
from app.services.telegram_polling import telegram_polling_worker

app = FastAPI(title=settings.app_name)
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def startup_event() -> None:
    telegram_polling_worker.start()


@app.on_event("shutdown")
def shutdown_event() -> None:
    telegram_polling_worker.stop()


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name, "team": settings.team_name}
