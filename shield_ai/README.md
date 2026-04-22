# SHIELD AI Agent

Demo he thong AI Agent phan tich ticket tu dong va dashboard quan ly ticket theo phong cach ITSM.

## Muc tieu he thong

- Nhan noi dung ticket tu Telegram Bot
- Gui ticket sang Gemini AI de phan tich theo service catalog
- Tra ve `Service`, `Priority`, `PIC`, `SOP`, `SLA`
- Cho phep nhan vien CS xac nhan tao ticket
- Gui ticket sang Make.com webhook de ghi Google Sheets va theo doi SLA 24h

## Kien truc

`Telegram -> AI Agent -> Web Dashboard -> Make Webhook -> Google Sheets -> SLA Monitoring -> Telegram Alert`

## Cau truc project

```text
shield_ai/
	backend/
		src/
			routes/
	frontend/
		src/
			components/
			data/
			lib/
	services/
		geminiService.js
		makeWebhookService.js
		serviceCatalog.js
		telegramService.js
		ticketStore.js
		ticketUtils.js
	data/
		pending-analyses.json
		serviceCatalog.json
		tickets.json
```

## Backend API

Base URL mac dinh: `http://localhost:8080`

### Health

```bash
GET /health
```

### Analyze ticket

```bash
POST /api/tickets/analyze
```

Body:

```json
{
	"message": "User không thể kết nối VPN từ sáng",
	"telegramUser": "cs_operator"
}
```

### Create ticket

```bash
POST /api/tickets/create
```

Body:

```json
{
	"analysis": {
		"customerMessage": "User không thể kết nối VPN từ sáng",
		"service": "VPN",
		"priority": "High",
		"pic": "Network Team",
		"sop": "SOP-VPN-01",
		"sla": "24h"
	},
	"attachments": [
		{
			"name": "vpn-error.png",
			"mimeType": "image/png",
			"kind": "image",
			"size": 128430,
			"dataUrl": "data:image/png;base64,..."
		}
	],
	"telegramUser": "cs_operator"
}
```

### Send to Make

```bash
POST /api/tickets/send-to-make
```

### Dashboard summary

```bash
GET /api/dashboard/summary
```

### Telegram webhook

```bash
POST /api/telegram/webhook
```

Webhook nay nhan tin nhan forward tu Telegram va lenh `/create`.

## Frontend dashboard

Dashboard co 4 khu vuc chinh trong sidebar:

- Ticket Analysis
- Ticket Database
- SLA Monitoring
- Service Catalog

Main area hien thi:

- Customer Message
- Service
- Priority
- PIC
- SOP
- SLA

Va 3 nut thao tac:

- Analyze Ticket
- Create Ticket
- Send to Make

## Service catalog va AI analysis

Service catalog demo nam o `data/serviceCatalog.json`.

Ham `services/geminiService.js`:

- goi Gemini neu co `GEMINI_API_KEY`
- fallback ve match keyword tu catalog neu chua cau hinh API key

## Make webhook integration

Ham `services/makeWebhookService.js` se gui payload dang:

```json
{
	"ticket_message": "...",
	"service": "...",
	"priority": "...",
	"pic": "...",
	"sop": "...",
	"sla": "24h",
	"ticket_id": "TK-20260421-1234",
	"telegram_user": "username",
	"telegram_chat_id": "123456",
	"status": "OPEN",
	"timestamp": "2026-04-21T10:00:00.000Z"
}
```

Neu chua co `MAKE_WEBHOOK_URL`, he thong se tra ket qua `mock` de demo.

## Bien moi truong

Copy `.env.example` thanh `.env` va dien gia tri:

```env
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
MAKE_WEBHOOK_URL=https://hook.make.com/xxxxx
TELEGRAM_BOT_TOKEN=
DEFAULT_SLA_HOURS=24
COMPANY_NAME=Shield AI Operations
```

## Cach chay

Sau khi cai Node.js:

```bash
cd shield_ai
npm --prefix backend install
npm --prefix frontend install
```

Chay backend:

```bash
npm --prefix backend run dev
```

Chay frontend:

```bash
npm --prefix frontend run dev
```

## Ghi chu quan trong

Khi Google Sheets duoc cau hinh, ticket tao moi va cap nhat status se tu dong dong bo len sheet.

Attachment hien duoc dong bo theo metadata va noi dung demo trong cac cot:

- `attachment_count`
- `attachment_names`
- `attachment_manifest`

`attachment_manifest` la JSON string, phu hop cho demo va file nho. Neu muon dua vao van hanh that, nen luu file len cloud storage roi chi dong bo link len Google Sheets.

Workspace hien tai chua co `node` va `npm`, nen project da duoc scaffold day du nhung chua the duoc run va build xac minh ngay trong phien lam viec nay.
