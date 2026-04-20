from datetime import datetime

from app.models.ticket import TicketRecord
from app.services.repository import SQLiteTicketRepository


def test_sqlite_repository_persists_ticket(tmp_path):
    database_path = tmp_path / "tickets.db"
    repository = SQLiteTicketRepository(str(database_path))
    ticket = TicketRecord(
        ticket_id="TK-TEST-001",
        testcase_id="TC-02",
        severity_level="Cấp 1",
        priority="Low",
        market="PH",
        customer_message="Anh muốn biết sản phẩm còn bao nhiêu tồn kho?",
        catalog_lane="DVKH - Kiểm tra tồn kho",
        category="Kiểm tra tồn kho sản phẩm",
        primary_department="DVKH",
        assigned_pic="DVKH",
        notified_departments=["DVKH"],
        started_at=datetime(2026, 4, 20, 8, 0, 0),
        due_at=datetime(2026, 4, 20, 8, 15, 0),
        sla_label="≤15 phút",
        suggested_reply="Đã tiếp nhận yêu cầu kiểm tra tồn kho.",
        handling_plan="DVKH kiểm tra PM và phản hồi số lượng tồn.",
    )

    repository.add(ticket)

    reloaded_repository = SQLiteTicketRepository(str(database_path))
    loaded_ticket = reloaded_repository.get("TK-TEST-001")

    assert loaded_ticket is not None
    assert loaded_ticket.ticket_id == ticket.ticket_id
    assert loaded_ticket.testcase_id == "TC-02"
    assert reloaded_repository.list_all()[0].ticket_id == ticket.ticket_id


def test_repository_returns_latest_ticket_by_chat_id(tmp_path):
    database_path = tmp_path / "tickets.db"
    repository = SQLiteTicketRepository(str(database_path))

    older_ticket = TicketRecord(
        ticket_id="TK-TEST-001",
        testcase_id="TC-02",
        severity_level="Cấp 1",
        priority="Low",
        market="PH",
        customer_message="Case cũ",
        catalog_lane="DVKH - Kiểm tra tồn kho",
        category="Kiểm tra tồn kho sản phẩm",
        primary_department="DVKH",
        assigned_pic="DVKH",
        notified_departments=["DVKH"],
        started_at=datetime(2026, 4, 20, 8, 0, 0),
        due_at=datetime(2026, 4, 20, 8, 15, 0),
        sla_label="≤15 phút",
        suggested_reply="Đã tiếp nhận yêu cầu kiểm tra tồn kho.",
        handling_plan="DVKH kiểm tra PM và phản hồi số lượng tồn.",
        metadata={"chat_id": "chat-1"},
    )
    newer_ticket = TicketRecord(
        ticket_id="TK-TEST-002",
        testcase_id="TC-11",
        severity_level="Cấp 2",
        priority="Medium",
        market="PH",
        customer_message="Case mới",
        catalog_lane="Vận đơn - Chậm giao",
        category="Giao hàng chậm",
        primary_department="Vận đơn",
        assigned_pic="PIC vận đơn",
        notified_departments=["CSR"],
        started_at=datetime(2026, 4, 20, 9, 0, 0),
        due_at=datetime(2026, 4, 20, 13, 0, 0),
        sla_label="≤4 giờ",
        suggested_reply="Đã tiếp nhận case chậm giao.",
        handling_plan="Liên hệ đơn vị vận chuyển để thúc giao.",
        metadata={"chat_id": "chat-1"},
    )

    repository.add(older_ticket)
    repository.add(newer_ticket)

    latest_ticket = repository.get_latest_ticket_by_chat_id("chat-1")

    assert latest_ticket is not None
    assert latest_ticket.ticket_id == "TK-TEST-002"