# Huong Dan Chay Bot

Tai lieu nay huong dan cach chay Telegram AI bot local theo cach nhanh nhat va on dinh nhat.

## Cach nen dung

Neu ban chay local tren may ca nhan, nen dung `polling`.

Ly do:
- khong can domain public
- khong can webhook
- bot van nhan tin nhan truc tiep tu Telegram
- phu hop khi dang dev va test nhanh

## Dieu kien can co

- Python da cai san
- da tao bot voi BotFather va co `TELEGRAM_BOT_TOKEN`
- da clone repo ve may
- neu muon AI tra loi tot hon thi cai Ollama, neu khong co van chay duoc bang logic noi bo

## Buoc 1: vao dung thu muc

```powershell
cd work_ai_agent
```

## Buoc 2: cai thu vien

```powershell
pip install -r requirements.txt
```

Neu ban dang dung virtual environment rieng thi kich hoat env truoc khi cai.

## Buoc 3: tao file `.env`

Co the copy tu `.env.example` roi sua lai cac gia tri can thiet.

Gia tri toi thieu de bot nhan va tra loi tin nhan:

```env
APP_NAME=CS Work AI Agent
APP_ENV=development
SECRET_KEY=changeme
TEAM_NAME=CS
DATABASE_PATH=data/tickets.db

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_POLLING_ENABLED=true
TELEGRAM_POLLING_TIMEOUT_SECONDS=30

LLM_API_URL=http://127.0.0.1:11434/v1/chat/completions
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:3b-instruct
LLM_TIMEOUT_SECONDS=120

GOOGLE_SHEET_ID=
GOOGLE_WORKSHEET_NAME=Ticket
GOOGLE_SERVICE_ACCOUNT_JSON=

SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_USE_TLS=true
DEFAULT_NOTIFICATION_EMAIL=you@example.com
PIC_EMAIL_MAP={}
```

Bat buoc phai co:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_POLLING_ENABLED=true`

Chua bat buoc ngay khi moi chay:
- Google Sheet
- SMTP
- Ollama

Neu bo trong cau hinh AI, bot van fallback ve logic noi bo.

## Buoc 4: chay Ollama neu can AI local

Neu may da cai Ollama:

```powershell
ollama pull qwen2.5:3b-instruct
ollama serve
```

Neu khong chay Ollama, bot van co the phan loai va phan hoi bang rule noi bo.

## Buoc 5: chay backend

Mac dinh:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Neu cong `8000` dang bi chiem thi doi sang cong khac, vi du:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

## Buoc 6: kiem tra app da len chua

Mo trinh duyet hoac goi:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

Neu dang chay cong `8001` thi doi lai URL tuong ung.

Ket qua mong doi:

```json
{"status":"ok","app":"CS Work AI Agent","team":"CS"}
```

## Buoc 7: test bot tren Telegram

Gui tin nhan truc tiep cho bot, vi du:
- `Shop bao ton kho sai, can check gap`
- `tao ticket: Don nay 3 ngay chua giao`
- `xac nhan tao ticket`
- `nhac pic`

Khi polling dang bat:
- app se tu nhan update tu Telegram
- app se tu go `deleteWebhook` luc startup de tranh webhook cu gay ket

## Cac lenh Telegram co san

- Gui cau hoi binh thuong: bot phan tich va tra loi nhu tro ly ao
- `tao ticket: <noi dung>`: tao ticket ngay
- `/ticket <noi dung>`: tao ticket ngay
- `xac nhan tao ticket`: tao ticket tu draft gan nhat
- `nhac pic`: gui mail nhac PIC neu SMTP da cau hinh
- `huy ticket`: xoa draft hien tai

## Neu muon dung webhook thay vi polling

Chi nen dung khi ban co URL HTTPS public on dinh.

Khi do:
- tat `TELEGRAM_POLLING_ENABLED`
- chay backend tren public URL
- goi `setWebhook` cho Telegram tro vao `/api/v1/telegram/webhook`

## Loi thuong gap

### Bot khong nhan tin nhan

Kiem tra:
- app con dang chay khong
- `TELEGRAM_BOT_TOKEN` co dung khong
- `TELEGRAM_POLLING_ENABLED=true` chua
- webhook cu da duoc go chua

Kiem tra webhook info:

```powershell
Invoke-RestMethod -Method Get -Uri "https://api.telegram.org/bot<token>/getWebhookInfo"
```

Neu dung polling thi `url` nen rong.

### Bot len nhung tra loi cham

Thu kiem tra:
- Ollama da chay chua
- model co qua nang khong
- co the doi sang `qwen2.5:3b-instruct`

### Bot khong gui duoc email

Can them:
- `SMTP_HOST`
- `SMTP_FROM_EMAIL`
- neu mail server co auth thi them `SMTP_USERNAME`, `SMTP_PASSWORD`

### Bot khong ghi duoc Google Sheet

Can them:
- `GOOGLE_SHEET_ID`
- `GOOGLE_WORKSHEET_NAME`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

## File can xem khi can debug

- `app/main.py`: startup app va polling worker
- `app/api/v1.py`: API webhook va endpoints chinh
- `app/services/telegram_polling.py`: nhan update theo polling
- `app/services/telegram_updates.py`: xu ly logic update Telegram
- `app/services/telegram.py`: gui tin nhan tra loi ve Telegram
- `app/core/config.py`: doc bien moi truong