const axios = require('axios');

async function sendToMake(ticketData) {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  const payload = {
    ticket_message: ticketData.customerMessage,
    service: ticketData.service,
    priority: ticketData.priority,
    pic: ticketData.pic,
    sop: ticketData.sop,
    sla: ticketData.sla,
    ticket_id: ticketData.ticketId,
    telegram_user: ticketData.telegramUser,
    telegram_chat_id: ticketData.telegramChatId,
    status: ticketData.status,
    timestamp: ticketData.createdAt,
  };

  if (!webhookUrl) {
    return {
      delivered: false,
      mode: 'mock',
      payload,
      message: 'MAKE_WEBHOOK_URL is not configured. Payload was prepared for Make.com.',
    };
  }

  const response = await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  return {
    delivered: true,
    mode: 'live',
    statusCode: response.status,
    payload,
  };
}

module.exports = {
  sendToMake,
};
