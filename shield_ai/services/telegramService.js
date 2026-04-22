const axios = require('axios');
const { analyzeTicket } = require('./geminiService');
const { sendToMake } = require('./makeWebhookService');
const { buildTicketPayload } = require('./ticketUtils');
const { savePendingAnalysis, getPendingAnalysisByChatId, clearPendingAnalysis, saveTicket } = require('./ticketStore');

function extractTelegramMessage(update) {
  const message = update.message || update.edited_message;
  if (!message || !(message.text || message.caption)) {
    return null;
  }

  return {
    text: (message.text || message.caption || '').trim(),
    chatId: String(message.chat?.id || ''),
    username: message.from?.username || message.from?.first_name || 'telegram-user',
  };
}

function buildAnalysisReply(analysis) {
  return [
    `Service: ${analysis.service}`,
    `Priority: ${analysis.priority}`,
    `PIC: ${analysis.pic}`,
    `SOP: ${analysis.sop}`,
    `SLA: ${analysis.sla}`,
    '',
    'Nếu ổn thì gửi /create để tạo ticket chính thức.',
  ].join('\n');
}

async function sendTelegramText(chatId, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { delivered: false, mode: 'disabled' };
  }

  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await axios.post(url, {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });

  return { delivered: Boolean(response.data?.ok), mode: 'live' };
}

async function processTelegramUpdate(update) {
  const telegramMessage = extractTelegramMessage(update);
  if (!telegramMessage) {
    return { ok: true, ignored: true, reason: 'No text message in update.' };
  }

  if (telegramMessage.text === '/create') {
    const pendingAnalysis = getPendingAnalysisByChatId(telegramMessage.chatId);
    if (!pendingAnalysis) {
      await sendTelegramText(telegramMessage.chatId, 'Chưa có ticket phân tích gần nhất để tạo. Bạn forward case trước rồi hãy gửi /create.');
      return { ok: true, created: false, reason: 'No pending analysis.' };
    }

    const ticket = buildTicketPayload(pendingAnalysis, {
      telegramUser: telegramMessage.username,
      telegramChatId: telegramMessage.chatId,
      source: 'telegram',
    });

    saveTicket(ticket);
    clearPendingAnalysis(pendingAnalysis.pendingId);
    const makeResult = await sendToMake(ticket);

    await sendTelegramText(
      telegramMessage.chatId,
      `Đã tạo ticket ${ticket.ticketId}.\nService: ${ticket.service}\nPriority: ${ticket.priority}\nPIC: ${ticket.pic}\nWebhook Make: ${makeResult.delivered ? 'sent' : 'mock mode'}`
    );

    return { ok: true, created: true, ticket, makeResult };
  }

  const analysis = await analyzeTicket(telegramMessage.text, {
    telegramUser: telegramMessage.username,
    telegramChatId: telegramMessage.chatId,
    source: 'telegram',
  });

  savePendingAnalysis(analysis);
  await sendTelegramText(telegramMessage.chatId, buildAnalysisReply(analysis));

  return { ok: true, analyzed: true, analysis };
}

module.exports = {
  processTelegramUpdate,
  sendTelegramText,
};
