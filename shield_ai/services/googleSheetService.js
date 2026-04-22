const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const sheetContextCache = {
  spreadsheetId: '',
  gid: '',
  sheetName: '',
  headerRow: null,
  expiresAt: 0,
};

const SHEET_HEADERS = [
  'ticket_id',
  'status',
  'service',
  'team',
  'severity_level',
  'priority',
  'market',
  'catalog_lane',
  'category',
  'primary_department',
  'assigned_pic',
  'notified_departments',
  'started_at',
  'due_at',
  'sla_label',
  'reminder_schedule',
  'suggested_reply',
  'handling_plan',
  'email_recipient',
  'pic',
  'sop',
  'sla',
  'sla_hours',
  'created_at',
  'sla_deadline',
  'telegram_user',
  'telegram_chat_id',
  'source',
  'customer_message',
  'confidence',
  'rationale',
  'attachment_count',
  'attachment_names',
  'attachment_manifest',
  'updated_at',
  'last_synced_at',
];

const STATUS_TO_SHEET = {
  OPEN: 'Tiếp nhận',
  'IN PROGRESS': 'Đang xử lý',
  RESOLVED: 'Hoàn tất',
};

const SHEET_TO_STATUS = Object.entries(STATUS_TO_SHEET).reduce((accumulator, [status, label]) => {
  accumulator[label.toLowerCase()] = status;
  return accumulator;
}, {});

const MARKET_CODE_MAP = {
  philippines: 'PH',
  indonesia: 'ID',
  malaysia: 'MY',
  thailand: 'TL',
  vietnam: 'VN',
};

function getSheetConfig() {
  return {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    sheetName: process.env.GOOGLE_SHEETS_TICKETS_SHEET || '',
    sheetGid: process.env.GOOGLE_SHEETS_TICKETS_GID || '',
    credentialsPath: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '',
    credentialsJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    credentialsBase64: process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || '',
  };
}

function isSheetsConfigured() {
  const config = getSheetConfig();
  return Boolean(config.spreadsheetId && (config.credentialsJson || config.credentialsBase64 || config.credentialsPath));
}

function readServiceAccountCredentials() {
  const config = getSheetConfig();

  if (config.credentialsJson) {
    return JSON.parse(config.credentialsJson);
  }

  if (config.credentialsBase64) {
    return JSON.parse(Buffer.from(config.credentialsBase64, 'base64').toString('utf-8'));
  }

  if (config.credentialsPath) {
    const resolvedPath = path.resolve(config.credentialsPath);
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  }

  throw new Error('Google Sheets credentials are not configured.');
}

async function getSheetsClient() {
  const credentials = readServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function getSheetValues(sheets, range) {
  const { spreadsheetId } = getSheetConfig();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

async function resolveSheetName(sheets) {
  const config = getSheetConfig();
  const now = Date.now();
  if (
    sheetContextCache.sheetName &&
    sheetContextCache.expiresAt > now &&
    sheetContextCache.spreadsheetId === config.spreadsheetId &&
    sheetContextCache.gid === String(config.sheetGid || '')
  ) {
    return sheetContextCache.sheetName;
  }

  let sheetName = '';
  if (config.sheetGid) {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
      fields: 'sheets(properties(sheetId,title))',
    });

    const matchedSheet = (metadata.data.sheets || []).find((sheet) => String(sheet.properties?.sheetId || '') === String(config.sheetGid));
    if (!matchedSheet) {
      throw new Error(`Could not find Google Sheet tab for gid ${config.sheetGid}.`);
    }

    sheetName = matchedSheet.properties.title;
  } else {
    sheetName = config.sheetName || 'Tickets';
  }

  updateSheetContextCache(config, { sheetName });
  return sheetName;
}

async function ensureHeaderRow(sheets) {
  const { spreadsheetId } = getSheetConfig();
  const sheetName = await resolveSheetName(sheets);
  const config = getSheetConfig();
  const now = Date.now();
  if (
    sheetContextCache.headerRow &&
    sheetContextCache.expiresAt > now &&
    sheetContextCache.spreadsheetId === config.spreadsheetId &&
    sheetContextCache.gid === String(config.sheetGid || '') &&
    sheetContextCache.sheetName === sheetName
  ) {
    return sheetContextCache.headerRow;
  }

  const range = `${sheetName}!A1:${columnLetter(SHEET_HEADERS.length)}1`;
  const existingHeader = await getSheetValues(sheets, range);

  if (existingHeader.length && existingHeader[0].length) {
    const mergedHeader = mergeHeaders(existingHeader[0], SHEET_HEADERS);

    if (!areHeadersEqual(existingHeader[0], mergedHeader)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:${columnLetter(mergedHeader.length)}1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [mergedHeader],
        },
      });
    }

    updateSheetContextCache(config, { sheetName, headerRow: mergedHeader });
    return mergedHeader;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [SHEET_HEADERS],
    },
  });

  updateSheetContextCache(config, { sheetName, headerRow: SHEET_HEADERS });
  return SHEET_HEADERS;
}

function updateSheetContextCache(config, nextValues = {}) {
  sheetContextCache.spreadsheetId = config.spreadsheetId || '';
  sheetContextCache.gid = String(config.sheetGid || '');
  sheetContextCache.sheetName = nextValues.sheetName || sheetContextCache.sheetName;
  sheetContextCache.headerRow = nextValues.headerRow || sheetContextCache.headerRow;
  sheetContextCache.expiresAt = Date.now() + 60 * 1000;
}

function columnLetter(columnNumber) {
  let dividend = columnNumber;
  let columnName = '';

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

function serializeTicket(ticket) {
  const record = buildSheetRecord(ticket);
  return SHEET_HEADERS.map((header) => record[header] ?? '');
}

function buildSheetRecord(ticket) {
  const attachments = normalizeAttachments(ticket.attachments);
  const notifications = Array.isArray(ticket.notificationGroups) ? ticket.notificationGroups : [];
  const localizedStatus = normalizeStatusForSheet(ticket.status);
  const marketCode = normalizeMarketCode(ticket.market);
  const primaryDepartment = ticket.complaintGroup || notifications[0] || extractPrimaryDepartment(ticket.departmentPic) || '';
  const assignedPic = ticket.departmentPic || ticket.pic || '';
  const suggestedReply = buildSuggestedReply(ticket);
  const handlingPlan = buildHandlingPlan(ticket);
  const team = ticket.customerServicePic ? 'DVKH' : 'CS';

  return {
    ticket_id: ticket.ticketId,
    service: ticket.service,
    team,
    severity_level: ticket.escalationLabel || buildSeverityLabel(ticket.escalationLevel, ticket.priority),
    priority: ticket.priority,
    market: marketCode,
    customer_message: ticket.customerMessage,
    catalog_lane: ticket.service,
    category: ticket.complaintGroup || ticket.service,
    primary_department: primaryDepartment,
    assigned_pic: assignedPic,
    notified_departments: JSON.stringify(notifications),
    status: localizedStatus,
    started_at: ticket.createdAt,
    due_at: ticket.slaDeadline,
    sla_label: buildSlaLabel(ticket),
    reminder_schedule: '[]',
    suggested_reply: suggestedReply,
    handling_plan: handlingPlan,
    email_recipient: ticket.emailRecipient || '',
    pic: ticket.pic,
    sop: ticket.sop,
    sla: ticket.sla,
    sla_hours: ticket.slaHours,
    created_at: ticket.createdAt,
    sla_deadline: ticket.slaDeadline,
    telegram_user: ticket.telegramUser,
    telegram_chat_id: ticket.telegramChatId,
    source: ticket.source,
    confidence: ticket.confidence,
    rationale: ticket.rationale,
    attachment_count: attachments.length,
    attachment_names: attachments.map((attachment) => attachment.name).join(', '),
    attachment_manifest: JSON.stringify(attachments),
    updated_at: ticket.updatedAt || ticket.createdAt,
    last_synced_at: new Date().toISOString(),
  };
}

function normalizeStatusForSheet(status) {
  return STATUS_TO_SHEET[String(status || '').toUpperCase()] || String(status || 'Tiếp nhận');
}

function normalizeStatusFromSheet(status) {
  const normalized = String(status || '').trim();
  if (!normalized) {
    return 'OPEN';
  }

  const upper = normalized.toUpperCase();
  if (STATUS_TO_SHEET[upper]) {
    return upper;
  }

  return SHEET_TO_STATUS[normalized.toLowerCase()] || upper;
}

function normalizeMarketCode(market) {
  const normalized = String(market || '').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= 3) {
    return normalized.toUpperCase();
  }

  return MARKET_CODE_MAP[normalized.toLowerCase()] || normalized;
}

function buildSeverityLabel(level, priority) {
  if (Number(level)) {
    return `Cấp ${level}`;
  }
  if (String(priority || '').toLowerCase() === 'critical') {
    return 'Cấp 1';
  }
  if (String(priority || '').toLowerCase() === 'high') {
    return 'Cấp 2';
  }
  return '';
}

function extractPrimaryDepartment(departmentPic) {
  return String(departmentPic || '').split('+')[0].trim();
}

function buildSlaLabel(ticket) {
  if (ticket.sla && /≤|gio|giờ|hour|hours/i.test(String(ticket.sla))) {
    return ticket.sla;
  }

  if (Number(ticket.slaHours) > 0) {
    return `≤${ticket.slaHours} giờ`;
  }

  return ticket.sla || '';
}

function buildSuggestedReply(ticket) {
  if (ticket.recommendedOutput) {
    return `Đã tiếp nhận ticket ${ticket.ticketId}. ${ticket.recommendedOutput}`;
  }

  if (ticket.rationale) {
    return `Đã tiếp nhận yêu cầu và chuyển xử lý theo ${ticket.service || 'dịch vụ phù hợp'}. ${ticket.rationale}`;
  }

  return `Đã tiếp nhận ticket ${ticket.ticketId} và đang xử lý.`;
}

function buildHandlingPlan(ticket) {
  if (ticket.recommendedOutput) {
    return ticket.recommendedOutput;
  }

  return [ticket.sop, ticket.rationale].filter(Boolean).join(' | ');
}

function normalizeAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .filter(Boolean)
    .map((attachment) => ({
      id: attachment.id || '',
      name: attachment.name || 'attachment',
      mimeType: attachment.mimeType || 'application/octet-stream',
      size: Number(attachment.size || 0),
      kind: attachment.kind || (String(attachment.mimeType || '').startsWith('image/') ? 'image' : 'file'),
      dataUrl: attachment.dataUrl || '',
    }));
}

function mergeHeaders(existingHeader, requiredHeaders) {
  const normalizedExisting = existingHeader.map((header) => normalizeHeader(header));
  const merged = [...existingHeader];

  requiredHeaders.forEach((header) => {
    if (!normalizedExisting.includes(normalizeHeader(header))) {
      merged.push(header);
    }
  });

  return merged;
}

function areHeadersEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((header, index) => normalizeHeader(header) === normalizeHeader(right[index]));
}

function buildTicketSheetValues(headerRow, ticket) {
  const serializedTicket = serializeTicket(ticket);
  const ticketMap = SHEET_HEADERS.reduce((accumulator, header, index) => {
    accumulator[normalizeHeader(header)] = serializedTicket[index] ?? '';
    return accumulator;
  }, {});

  return headerRow.map((header) => ticketMap[normalizeHeader(header)] ?? '');
}

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase();
}

function rowToTicket(headerRow, rowValues) {
  const row = headerRow.reduce((accumulator, header, index) => {
    accumulator[normalizeHeader(header)] = rowValues[index] || '';
    return accumulator;
  }, {});

  let attachments = [];
  if (row.attachment_manifest) {
    try {
      attachments = normalizeAttachments(JSON.parse(row.attachment_manifest));
    } catch (error) {
      attachments = [];
    }
  }

  return {
    ticketId: row.ticket_id,
    status: normalizeStatusFromSheet(row.status),
    service: row.service,
    priority: row.priority,
    pic: row.pic || row.assigned_pic,
    sop: row.sop,
    sla: row.sla,
    slaHours: Number.parseInt(String(row.sla_hours || 24), 10) || 24,
    createdAt: row.created_at || row.started_at,
    slaDeadline: row.sla_deadline || row.due_at,
    telegramUser: row.telegram_user,
    telegramChatId: row.telegram_chat_id,
    source: row.source,
    customerMessage: row.customer_message,
    confidence: Number.parseFloat(String(row.confidence || 0)) || 0,
    rationale: row.rationale,
    attachments,
    updatedAt: row.updated_at,
    lastSyncedAt: row.last_synced_at,
    complaintGroup: row.category || row.primary_department,
    market: row.market,
    escalationLabel: row.severity_level,
    departmentPic: row.assigned_pic,
    customerServicePic: row.team,
    notificationGroups: parseJsonArray(row.notified_departments),
    recommendedOutput: row.handling_plan,
  };
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function isResolvedStatus(status) {
  return String(status || '').toUpperCase() === 'RESOLVED';
}

function computeDueState(ticket, windowMinutes, nowTimestamp) {
  const deadlineTimestamp = new Date(ticket.slaDeadline || '').getTime();
  if (!Number.isFinite(deadlineTimestamp)) {
    return null;
  }

  const deltaMinutes = Math.floor((deadlineTimestamp - nowTimestamp) / 60000);
  const isOverdue = deadlineTimestamp <= nowTimestamp;
  const isDueSoon = !isOverdue && deltaMinutes <= windowMinutes;

  if (!isOverdue && !isDueSoon) {
    return null;
  }

  return {
    ...ticket,
    minutesToDeadline: deltaMinutes,
    dueState: isOverdue ? 'OVERDUE' : 'DUE_SOON',
  };
}

function buildTicketIndex(rows) {
  return rows.slice(1).reduce((accumulator, row, index) => {
    const ticketId = row[0];
    if (ticketId) {
      accumulator.set(ticketId, index + 2);
    }
    return accumulator;
  }, new Map());
}

async function getSheetContext(sheets) {
  const sheetName = await resolveSheetName(sheets);
  const headerRow = await ensureHeaderRow(sheets);
  return {
    sheetName,
    headerRow,
  };
}

async function upsertTicketToSheet(ticket, options = {}) {
  if (!isSheetsConfigured()) {
    return {
      configured: false,
      delivered: false,
      mode: 'mock',
      message: 'Google Sheets is not configured. Ticket sync was skipped.',
      ticketId: ticket.ticketId,
    };
  }

  const sheets = options.sheets || await getSheetsClient();
  const { spreadsheetId } = getSheetConfig();
  const context = options.context || await getSheetContext(sheets);
  const { sheetName, headerRow } = context;
  const rowIndexMap = options.rowIndexMap || buildTicketIndex(await getSheetValues(sheets, `${sheetName}!A:${columnLetter(headerRow.length)}`));
  const absoluteRow = rowIndexMap.get(ticket.ticketId);
  const values = [buildTicketSheetValues(headerRow, ticket)];

  if (absoluteRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${absoluteRow}:${columnLetter(headerRow.length)}${absoluteRow}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return {
      configured: true,
      delivered: true,
      mode: 'live',
      action: 'updated',
      rowNumber: absoluteRow,
      ticketId: ticket.ticketId,
    };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:${columnLetter(headerRow.length)}`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });

  if (options.rowIndexMap) {
    const nextRowNumber = options.nextRowNumber || rowIndexMap.size + 2;
    rowIndexMap.set(ticket.ticketId, nextRowNumber);
    options.nextRowNumber = nextRowNumber + 1;
  }

  return {
    configured: true,
    delivered: true,
    mode: 'live',
    action: 'inserted',
    ticketId: ticket.ticketId,
  };
}

async function syncTicketsToSheet(tickets) {
  if (!isSheetsConfigured()) {
    return tickets.map((ticket) => ({
      configured: false,
      delivered: false,
      mode: 'mock',
      message: 'Google Sheets is not configured. Ticket sync was skipped.',
      ticketId: ticket.ticketId,
    }));
  }

  const sheets = await getSheetsClient();
  const context = await getSheetContext(sheets);
  const rows = await getSheetValues(sheets, `${context.sheetName}!A:${columnLetter(context.headerRow.length)}`);
  const rowIndexMap = buildTicketIndex(rows);
  const options = {
    sheets,
    context,
    rowIndexMap,
    nextRowNumber: rows.length + 1,
  };
  const results = [];
  for (const ticket of tickets) {
    results.push(await upsertTicketToSheet(ticket, options));
  }
  return results;
}

async function scanDueTicketsFromSheet(options = {}) {
  const windowMinutes = Number.parseInt(String(options.windowMinutes || 60), 10) || 60;
  const nowTimestamp = Date.now();

  if (!isSheetsConfigured()) {
    return {
      configured: false,
      source: 'unconfigured',
      windowMinutes,
      dueTickets: [],
      message: 'Google Sheets is not configured.',
    };
  }

  const sheets = await getSheetsClient();
  const sheetName = await resolveSheetName(sheets);
  const headerRow = await ensureHeaderRow(sheets);
  const rows = await getSheetValues(sheets, `${sheetName}!A:${columnLetter(headerRow.length)}`);

  if (!rows.length) {
    return {
      configured: true,
      source: 'google-sheets',
      windowMinutes,
      dueTickets: [],
    };
  }

  const [, ...dataRows] = rows;
  const dueTickets = dataRows
    .map((row) => rowToTicket(headerRow, row))
    .filter((ticket) => ticket.ticketId && !isResolvedStatus(ticket.status))
    .map((ticket) => computeDueState(ticket, windowMinutes, nowTimestamp))
    .filter(Boolean)
    .sort((left, right) => new Date(left.slaDeadline).getTime() - new Date(right.slaDeadline).getTime());

  return {
    configured: true,
    source: 'google-sheets',
    windowMinutes,
    dueTickets,
    scannedAt: new Date().toISOString(),
  };
}

module.exports = {
  isSheetsConfigured,
  upsertTicketToSheet,
  syncTicketsToSheet,
  scanDueTicketsFromSheet,
};