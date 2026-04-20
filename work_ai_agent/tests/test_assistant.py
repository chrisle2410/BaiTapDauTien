from app.models.ticket import TelegramMessageIn
from app.services.assistant import extract_command_payload, extract_push_payload, is_confirm_command, is_create_command, is_push_command
from app.services.repository import SQLiteTicketRepository


def test_create_command_detection():
    assert is_create_command("tạo ticket: đơn này chưa bàn giao cho đvvc")
    assert is_create_command("/ticket don TK042 chua giao")
    assert extract_command_payload("tạo ticket: đơn này chưa bàn giao cho đvvc") == "đơn này chưa bàn giao cho đvvc"


def test_confirm_command_detection():
    assert is_confirm_command("xac nhan tao ticket")
    assert is_confirm_command("xác nhận")


def test_push_command_detection():
    assert is_push_command("nhắc pic")
    assert is_push_command("push xử lý: shop đang giục")
    assert extract_push_payload("push xử lý: shop đang giục") == "shop đang giục"


def test_repository_can_store_and_clear_draft(tmp_path):
    from app.agents.orchestrator import orchestrator

    repository = SQLiteTicketRepository(str(tmp_path / "assistant.db"))
    draft = orchestrator.build_draft(
        TelegramMessageIn(
            chat_id="assistant-chat",
            sender_name="CS Support",
            message_text="Đơn TK042 hàng 3 ngày rồi J&T chưa giao, pushing giúp em.",
        )
    )
    repository.save_draft(draft)

    loaded_draft = repository.get_draft("assistant-chat")
    assert loaded_draft is not None
    assert loaded_draft.analysis.testcase_id == "TC-11"

    repository.delete_draft("assistant-chat")
    assert repository.get_draft("assistant-chat") is None


def test_repository_reserves_telegram_update_once(tmp_path):
    repository = SQLiteTicketRepository(str(tmp_path / "assistant.db"))

    assert repository.reserve_telegram_update(123456) is True
    assert repository.reserve_telegram_update(123456) is False


def test_inventory_mismatch_case_routes_to_warehouse():
    from app.agents.orchestrator import orchestrator

    analysis = orchestrator.analyze(
        "@Klinh_29999 chị ơi bên em check tồn kho đang thấy có những mã này bị lệch sl, chị báo kho kiểm lại giúp em ạ"
    )

    assert analysis.testcase_id == "TC-INV-01"
    assert analysis.primary_department == "Kho"
    assert analysis.severity_level == "Cấp 2"
    assert analysis.sla_label == "≤2 giờ"