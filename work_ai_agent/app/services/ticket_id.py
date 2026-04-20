from datetime import datetime
import random


def generate_ticket_id(now: datetime | None = None) -> str:
    current = now or datetime.utcnow()
    suffix = random.randint(100, 999)
    return f"TK{current.strftime('%y%m%d%H%M')}{suffix}"
