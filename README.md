# BaiTapDauTien

Repository nay hien dang dung `shield_ai/` lam project chinh cho demo AI Agent phan tich ticket va dashboard quan ly ITSM.

## Kien truc hien tai

`Telegram Bot -> Express API -> Gemini analysis -> React dashboard -> Make webhook -> Google Sheets -> SLA monitoring`

## Thu muc chinh

- `shield_ai/frontend/`: React + Tailwind dashboard
- `shield_ai/backend/`: Express API cho phan tich ticket, tao ticket, webhook Telegram, gui Make
- `shield_ai/services/`: service dung chung cho Gemini, Telegram, Make, ticket store, service catalog
- `shield_ai/data/`: service catalog mau va du lieu demo cho ticket/pending analysis

## Chuc nang chinh

- Phan tich noi dung ticket bang Gemini AI thong qua ham `analyzeTicket(message)`
- Map ticket theo service catalog de lay `Service`, `Priority`, `PIC`, `SOP`, `SLA`
- Tao ticket theo format `TK-YYYYMMDD-XXXX`
- Gui payload sang Make.com webhook bang Axios thong qua `sendToMake(ticketData)`
- Quan sat ticket tren dashboard voi cac khu vuc:
	- Ticket Analysis
	- Ticket Database
	- SLA Monitoring
	- Service Catalog
- Ho tro webhook Telegram de nhan tin forward va lenh `/create`

## Luu y moi truong

May hien tai chua co `node` va `npm`, vi vay code da duoc scaffold day du nhung chua the chay build/runtime ngay tren workspace nay. Sau khi cai Node.js, ban co the vao `shield_ai/` de cai package va chay project.

## Tai lieu chi tiet

- Xem huong dan day du tai `shield_ai/README.md`