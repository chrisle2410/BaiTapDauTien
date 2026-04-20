# CS Work AI Agent

Khung dự án cho AI Agent hỗ trợ team CS, hiện được điều khiển theo framework test DVKH 33 tình huống của bạn.

Luồng chính:

`Telegram message -> trợ lý ảo phân tích -> gán TC ID / cấp độ / PIC / phòng ban notify / SLA -> chờ lệnh hoặc xác nhận -> tạo ticket -> điền Google Sheet -> dashboard`

## Cấu trúc
- `app/api/`: API cho Telegram processing, ticket lookup, email, dashboard
- `app/agents/`: Orchestrator điều phối workflow của agent
- `app/services/`: Rule engine framework, Google Sheet, SLA, email, dashboard, repository
- `app/models/`: Model request/response/ticket
- `app/core/`: Cấu hình tích hợp
- `tests/`: Smoke test cơ bản

## Khởi động nhanh
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## API chính
```bash
GET  /health
GET  /api/v1/agent
POST /api/v1/telegram/process
POST /api/v1/telegram/webhook
GET  /api/v1/tickets
GET  /api/v1/tickets/{ticket_id}
POST /api/v1/tickets/{ticket_id}/send-email
GET  /api/v1/dashboard/summary
```

## Ví dụ xử lý message từ Telegram
```json
{
	"chat_id": "-100123456789",
	"sender_name": "CS Linh",
	"message_text": "Shop báo tồn kho sai, hôm qua bị huỷ 7 đơn và cần check gấp"
}
```

## Webhook Telegram
- Dùng `POST /api/v1/telegram/webhook` để Telegram đẩy update vào bot.
- Nếu bạn set `TELEGRAM_WEBHOOK_SECRET`, Telegram phải gửi header `X-Telegram-Bot-Api-Secret-Token` khớp giá trị đó.
- Bot mặc định hoạt động như trợ lý ảo: phân tích tình huống, trả về PIC, SLA, SOP và gợi ý trả lời.
- Bot chỉ tạo ticket thật trên sheet khi người dùng gửi lệnh rõ ràng như `tạo ticket ...`, `/ticket ...` hoặc xác nhận `xác nhận tạo ticket` sau khi bot đã phân tích xong.

## Polling Telegram
- Nếu không có URL public HTTPS ổn định, bạn có thể bật polling để bot tự kéo message từ Telegram mà không cần webhook.
- Bật trong `.env` bằng `TELEGRAM_POLLING_ENABLED=true`.
- Khi polling bật, app sẽ tự gọi `deleteWebhook` lúc startup để tránh bị kẹt vào webhook cũ.
- Polling phù hợp khi chạy local hoặc khi tunnel/public URL thường xuyên thay đổi.

## Cú pháp vận hành bot
- Gửi câu hỏi bình thường: bot trả lời như trợ lý ảo, chưa tạo ticket.
- Gửi `tạo ticket: <nội dung>` hoặc `/ticket <nội dung>`: bot tạo ticket ngay.
- Gửi nội dung bình thường trước, sau đó nhắn `xác nhận tạo ticket`: bot dùng draft gần nhất để tạo ticket lên sheet.
- Gửi `nhắc pic`, `push xử lý` hoặc `push xử lý: <lý do>`: bot gửi email nhắc PIC xử lý nhanh cho draft hiện tại; nếu draft đã được tạo ticket thì bot dùng ticket gần nhất của chat đó.
- Gửi `hủy ticket`: bot xóa draft chờ xác nhận hiện tại.

## Kích hoạt bot thật
1. Chạy API backend trên một URL public HTTPS, ví dụ `https://your-domain/api/v1/telegram/webhook`.
2. Điền `TELEGRAM_BOT_TOKEN` trong file `.env`.
3. Tùy chọn: điền `TELEGRAM_WEBHOOK_SECRET` trong `.env` để chặn request giả.
4. Gọi Telegram `setWebhook` với URL public của bạn.

Ví dụ PowerShell:
```powershell
$token = "<telegram_bot_token>"
$webhookUrl = "https://your-domain/api/v1/telegram/webhook"
$secret = "<optional_webhook_secret>"

Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Body @{ url = $webhookUrl; secret_token = $secret }
```

Kiểm tra webhook hiện tại:
```powershell
Invoke-RestMethod -Method Get -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
```

## Ghi chú tích hợp
- Google Sheet hiện đã đọc công khai được qua export CSV. Bot cũng đã hỗ trợ append thật vào sheet nếu bạn cấp `GOOGLE_SERVICE_ACCOUNT_JSON` dưới dạng đường dẫn file JSON hoặc nguyên nội dung JSON của service account.
- Hệ thống đang map ticket theo framework DVKH gồm `TC ID`, `Cấp độ`, `PIC chính`, `Phòng ban notify`, `SLA` và `Expected Output AI`.
- Reminder vẫn chạy mỗi 6 giờ cho ticket chưa hoàn thành, nhưng deadline chính của từng ticket được lấy theo rule của framework.
- Email người xử lý được lấy từ `PIC_EMAIL_MAP`, hoặc fallback về `DEFAULT_NOTIFICATION_EMAIL`.
- Chức năng gửi email nhắc PIC và gửi email ticket cần cấu hình `SMTP_HOST`, `SMTP_FROM_EMAIL`, và nếu có xác thực thì thêm `SMTP_USERNAME`, `SMTP_PASSWORD`.
- Ticket hiện được lưu bền vững bằng SQLite tại `DATABASE_PATH`, nên restart server sẽ không làm mất dữ liệu local.
- Nếu cấu hình `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`, bot có thể dùng endpoint chat-completions tương thích OpenAI để tạo phản hồi trợ lý ảo tốt hơn. Nếu chưa cấu hình, bot fallback về phản hồi nội bộ theo framework.

## Cau hinh Ollama local mien phi
Project này chạy được với Ollama local qua endpoint OpenAI-compatible.

Mac dinh de xuat:
```env
LLM_API_URL=http://127.0.0.1:11434/v1/chat/completions
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:3b-instruct
LLM_TIMEOUT_SECONDS=120
```

Tren Windows, cai va chay nhanh nhu sau:
```powershell
winget install Ollama.Ollama
ollama pull qwen2.5:3b-instruct
ollama serve
```

Neu may manh hon va muon chat tot hon:
```powershell
ollama pull qwen2.5:7b-instruct
```

Sau do doi model trong `.env` thanh:
```env
LLM_MODEL=qwen2.5:7b-instruct
```

Luu y:
- `LLM_API_KEY=ollama` chi la gia tri gia de tuong thich code hien tai.
- Ollama phai dang chay local truoc khi restart backend.
- Neu `http://127.0.0.1:11434` khong ton tai, bot se fallback ve phan hoi noi bo.
- Voi model local, request dau tien co the cham hon, nen timeout duoc tang len `120` giay mac dinh.

## Cau hinh OpenAI-compatible
Bot hỗ trợ endpoint kiểu OpenAI Chat Completions. Điền vào `.env` như sau:

```env
LLM_API_URL=https://your-llm-provider.example.com/v1/chat/completions
LLM_API_KEY=your_api_key
LLM_MODEL=gpt-4o-mini
```

Bot sẽ gửi payload dạng:
```json
{
	"model": "gpt-4o-mini",
	"messages": [
		{"role": "system", "content": "..."},
		{"role": "user", "content": "..."}
	],
	"temperature": 0.2
}
```

Va doc ket qua tu:
```json
{
	"choices": [
		{
			"message": {
				"content": "..."
			}
		}
	]
}
```

## Khi bạn đổi yêu cầu
Project này được set up theo hướng dễ quy hoạch lại. Nếu bạn đổi workflow sau này, nên chỉnh ở các lớp sau thay vì vá trực tiếp nhiều chỗ:
- `app/services/catalog_router.py`
- `app/agents/orchestrator.py`
- `app/services/google_sheets.py`
- `app/services/email_service.py`
