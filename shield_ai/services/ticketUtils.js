function generateTicketId(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `TK-${year}${month}${day}-${suffix}`;
}

function computeSlaDeadline(hours = 24, createdAt = new Date()) {
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + hours);
  return deadline.toISOString();
}

function normalizeAttachments(attachments = []) {
  return attachments
    .filter(Boolean)
    .map((attachment) => ({
      id: attachment.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: attachment.name || 'attachment',
      mimeType: attachment.mimeType || 'application/octet-stream',
      size: Number(attachment.size || 0),
      kind: String(attachment.kind || '').startsWith('image/') || String(attachment.mimeType || '').startsWith('image/') ? 'image' : attachment.kind || 'file',
      dataUrl: attachment.dataUrl || '',
    }))
    .filter((attachment) => attachment.dataUrl);
}

function buildTicketPayload(analysis, overrides = {}) {
  const createdAt = overrides.timestamp ? new Date(overrides.timestamp) : new Date();
  const ticketId = overrides.ticketId || generateTicketId(createdAt);
  const status = overrides.status || 'OPEN';
  const slaHours = Number.parseInt(String(overrides.slaHours || analysis.slaHours || 24), 10) || 24;

  return {
    ticketId,
    status,
    createdAt: createdAt.toISOString(),
    slaDeadline: computeSlaDeadline(slaHours, createdAt),
    customerMessage: analysis.customerMessage,
    service: analysis.service,
    priority: analysis.priority,
    pic: analysis.pic || analysis.departmentPic,
    sop: analysis.sop,
    sla: analysis.sla,
    slaHours,
    confidence: analysis.confidence,
    rationale: analysis.rationale,
    telegramUser: overrides.telegramUser || analysis.telegramUser || 'unknown',
    telegramChatId: overrides.telegramChatId || analysis.telegramChatId || '',
    source: overrides.source || analysis.source || 'dashboard',
    attachments: normalizeAttachments(overrides.attachments || analysis.attachments || []),
    testCaseId: analysis.testCaseId || '',
    complaintGroup: analysis.complaintGroup || '',
    market: analysis.market || '',
    gip: analysis.gip || '',
    escalationLevel: analysis.escalationLevel || null,
    escalationLabel: analysis.escalationLabel || '',
    customerServicePic: analysis.customerServicePic || '',
    departmentPic: analysis.departmentPic || '',
    notificationGroups: analysis.notificationGroups || [],
    recommendedOutput: analysis.recommendedOutput || '',
  };
}

module.exports = {
  generateTicketId,
  computeSlaDeadline,
  normalizeAttachments,
  buildTicketPayload,
};
