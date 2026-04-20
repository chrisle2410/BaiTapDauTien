from datetime import timedelta

from app.agents.orchestrator import orchestrator
from app.models.ticket import TelegramMessageIn
from app.core.config import settings


def test_settings_loaded():
    assert settings.team_name == "CS"


def test_orchestrator_processes_message():
    payload = TelegramMessageIn(
        chat_id="123",
        sender_name="CS User",
        message_text="Shop báo tồn kho sai và có nguy cơ hủy đơn liên tục",
    )
    result = orchestrator.process_telegram_message(payload)
    assert result.ticket.service == "Catalog"
    assert result.ticket.catalog_lane
    assert result.ticket.due_at > result.ticket.started_at


def test_framework_level_1_inventory_case():
    analysis = orchestrator.analyze("Anh muốn biết sản phẩm Collagen X còn bao nhiêu tồn kho?")
    assert analysis.testcase_id == "TC-02"
    assert analysis.severity_level == "Cấp 1"
    assert analysis.primary_department == "DVKH"
    assert analysis.sla_label == "≤15 phút"


def test_framework_level_2_delivery_delay_case():
    result = orchestrator.process_telegram_message(
        TelegramMessageIn(
            chat_id="123",
            sender_name="CS User",
            message_text="Đơn TK042 hàng 3 ngày rồi J&T chưa giao, pushing giúp em.",
        )
    )
    assert result.ticket.testcase_id == "TC-11"
    assert result.ticket.primary_department == "Vận đơn"
    assert "CSR" in result.ticket.notified_departments
    assert result.ticket.due_at - result.ticket.started_at == timedelta(hours=4)


def test_framework_level_3_ssc_outage_case():
    result = orchestrator.process_telegram_message(
        TelegramMessageIn(
            chat_id="123",
            sender_name="CS User",
            message_text="Toàn bộ SSC Philippines không lên đơn được từ sáng, hàng trăm đơn bị kẹt.",
        )
    )
    assert result.ticket.testcase_id == "TC-29"
    assert result.ticket.severity_level == "Cấp 3"
    assert result.ticket.priority == "Critical"
    assert "BLĐ" in result.ticket.notified_departments
    assert result.ticket.due_at - result.ticket.started_at == timedelta(minutes=30)


def test_framework_fallback_case():
    analysis = orchestrator.analyze("Nhờ kiểm tra giúp em một vấn đề phát sinh chưa rõ nhóm xử lý.")
    assert analysis.testcase_id == "TC-GENERAL"
    assert analysis.primary_department == "DVKH"
