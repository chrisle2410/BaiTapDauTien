const axios = require('axios');
const crypto = require('crypto');
const { loadServiceCatalog, matchService } = require('./serviceCatalog');
const { findShieldTestCaseMatch } = require('./shieldAnalysisService');

function buildPrompt(message) {
  const catalog = loadServiceCatalog();
  return [
    'You are an IT service management AI agent.',
    'Analyze the customer support ticket using the provided service catalog.',
    'Return only valid JSON with keys: service, priority, pic, sop, sla, rationale.',
    'If unsure, choose the closest matching service from the catalog and explain briefly in rationale.',
    '',
    'Service catalog:',
    JSON.stringify(catalog),
    '',
    'Ticket message:',
    message,
  ].join('\n');
}

function normalizeAnalysis(message, parsed, extra = {}) {
  const fallback = matchService(message);
  const shieldMatch = findShieldTestCaseMatch(message);
  const shield = shieldMatch?.routing;
  const useShieldRouting = Boolean(shield && shieldMatch.confidence >= 0.72);
  const resolvedService = useShieldRouting ? shield.service : parsed.service || shield?.service || fallback.service;
  const resolvedPriority = useShieldRouting ? shield.priority : parsed.priority || shield?.priority || fallback.priority;
  const resolvedPic = useShieldRouting ? shield.departmentPic : parsed.pic || shield?.departmentPic || fallback.pic;
  const resolvedSop = useShieldRouting ? shield.sop : parsed.sop || shield?.sop || fallback.sop;
  const resolvedSla = useShieldRouting ? shield.sla : parsed.sla || shield?.sla || fallback.sla;
  const resolvedSlaHours = shield?.slaHours || 24;
  const resolvedConfidence = Math.max(extra.confidence || 0, shieldMatch?.confidence || 0, fallback.confidence || 0);
  const resolvedRationale = useShieldRouting
    ? shield.rationale
    : parsed.rationale || shield?.rationale || `Matched catalog keywords: ${fallback.matchedKeywords.slice(0, 6).join(', ') || 'fallback default'}`;

  return {
    pendingId: extra.pendingId || crypto.randomUUID(),
    customerMessage: message,
    service: resolvedService,
    priority: resolvedPriority,
    pic: resolvedPic,
    sop: resolvedSop,
    sla: resolvedSla,
    slaHours: resolvedSlaHours,
    rationale: resolvedRationale,
    confidence: resolvedConfidence,
    telegramUser: extra.telegramUser || '',
    telegramChatId: extra.telegramChatId || '',
    source: extra.source || 'dashboard',
    analyzedAt: new Date().toISOString(),
    testCaseId: shield?.testCaseId || '',
    complaintGroup: shield?.complaintGroup || '',
    market: shield?.market || '',
    gip: shield?.gip || '',
    escalationLevel: shield?.escalationLevel || null,
    escalationLabel: shield?.escalationLabel || '',
    customerServicePic: shield?.customerServicePic || '',
    departmentPic: shield?.departmentPic || '',
    notificationGroups: shield?.notificationGroups || [],
    recommendedOutput: shield?.recommendedOutput || '',
    shieldConfidence: shieldMatch?.confidence || 0,
  };
}

function parseJsonFromText(text) {
  const trimmed = String(text || '').trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Gemini response did not contain JSON.');
  }

  return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
}

async function analyzeTicket(message, metadata = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    return normalizeAnalysis(message, {}, metadata);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = buildPrompt(message);

  const response = await axios.post(
    url,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '{}';
  const parsed = parseJsonFromText(text);
  return normalizeAnalysis(message, parsed, { ...metadata, confidence: 0.92 });
}

module.exports = {
  analyzeTicket,
};
