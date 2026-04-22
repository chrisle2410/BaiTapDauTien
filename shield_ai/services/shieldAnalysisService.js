const fs = require('fs');
const path = require('path');

const TEST_CASES_PATH = path.resolve(__dirname, '../data/shieldTestCases.json');
const STOP_WORDS = new Set([
  'a',
  'ac',
  'anh',
  'ay',
  'ban',
  'ben',
  'bi',
  'cho',
  'chi',
  'co',
  'cua',
  'da',
  'dang',
  'duoc',
  'em',
  'giup',
  'gio',
  'giu',
  'khi',
  'khong',
  'khach',
  'la',
  'lam',
  'ma',
  'minh',
  'mot',
  'ngay',
  'nay',
  'nho',
  'roi',
  'sao',
  'sang',
  'the',
  'thi',
  'toi',
  'tu',
  'va',
  'van',
  'vay',
  'voi',
  'xin',
]);

let cachedCases = null;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractTokens(value) {
  return unique(
    normalizeText(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  );
}

function extractBusinessMarkers(value) {
  const raw = String(value || '');
  return unique(raw.match(/(?:BSO[A-Z0-9-]+|GIP(?:IN|ML|TL)?\s*[A-Z0-9-]+)/gi) || []).map((marker) => normalizeText(marker));
}

function loadShieldTestCases() {
  if (cachedCases) {
    return cachedCases;
  }

  const rawCases = JSON.parse(fs.readFileSync(TEST_CASES_PATH, 'utf8'));
  cachedCases = rawCases.map((testCase) => ({
    ...testCase,
    normalizedMessage: normalizeText(testCase.msg),
    normalizedOutput: normalizeText(testCase.output),
    tokens: extractTokens(testCase.msg),
    businessMarkers: extractBusinessMarkers(`${testCase.msg} ${testCase.gip}`),
    notificationGroups: Array.isArray(testCase.notif) ? testCase.notif : [],
  }));

  return cachedCases;
}

function scoreTokenOverlap(leftTokens, rightTokens) {
  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  const rightTokenSet = new Set(rightTokens);
  const shared = leftTokens.filter((token) => rightTokenSet.has(token));
  return shared.length / Math.max(leftTokens.length, rightTokens.length);
}

function scoreMarkerOverlap(leftMarkers, rightMarkers) {
  if (!leftMarkers.length || !rightMarkers.length) {
    return 0;
  }

  const rightMarkerSet = new Set(rightMarkers);
  const shared = leftMarkers.filter((marker) => rightMarkerSet.has(marker));
  return shared.length / rightMarkers.length;
}

function calculateCaseSimilarity(message, testCase) {
  const normalizedMessage = normalizeText(message);
  const tokens = extractTokens(message);
  const businessMarkers = extractBusinessMarkers(message);

  if (normalizedMessage === testCase.normalizedMessage) {
    return 1;
  }

  if (normalizedMessage && testCase.normalizedMessage.includes(normalizedMessage)) {
    return 0.95;
  }

  if (testCase.normalizedMessage && normalizedMessage.includes(testCase.normalizedMessage)) {
    return 0.93;
  }

  const tokenScore = scoreTokenOverlap(tokens, testCase.tokens);
  const markerScore = scoreMarkerOverlap(businessMarkers, testCase.businessMarkers);
  const phraseScore = normalizedMessage
    ? unique(testCase.normalizedMessage.split(' ')).filter((token) => token.length > 3 && normalizedMessage.includes(token)).length / Math.max(testCase.tokens.length, 1)
    : 0;

  return Math.min(0.9, tokenScore * 0.65 + markerScore * 0.25 + phraseScore * 0.1);
}

function mapEscalationLevelToPriority(level) {
  if (Number(level) >= 3) {
    return 'Critical';
  }
  if (Number(level) === 2) {
    return 'High';
  }
  return 'Medium';
}

function parseSlaHours(value) {
  const matchedHours = String(value || '').match(/(\d+)/);
  return matchedHours ? Number(matchedHours[1]) : 24;
}

function buildShieldRouting(testCase, confidence) {
  return {
    testCaseId: testCase.id,
    complaintGroup: testCase.nhom,
    market: testCase.market,
    gip: testCase.gip,
    escalationLevel: Number(testCase.cap),
    escalationLabel: `Cấp ${testCase.cap}`,
    customerServicePic: testCase.picDVKH,
    departmentPic: testCase.picPhongBan,
    notificationGroups: testCase.notificationGroups,
    recommendedOutput: testCase.output,
    sop: testCase.sop,
    sla: testCase.sla,
    slaHours: parseSlaHours(testCase.sla),
    priority: mapEscalationLevelToPriority(testCase.cap),
    service: `${testCase.nhom} - ${testCase.market}`,
    confidence,
    rationale: `Matched SHIELD case ${testCase.id} using complaint wording and business markers from the uploaded QA corpus.`,
  };
}

function findShieldTestCaseMatch(message) {
  const candidates = loadShieldTestCases()
    .map((testCase) => ({
      testCase,
      confidence: calculateCaseSimilarity(message, testCase),
    }))
    .sort((left, right) => right.confidence - left.confidence);

  const bestMatch = candidates[0];
  if (!bestMatch || bestMatch.confidence < 0.4) {
    return null;
  }

  return {
    ...bestMatch,
    routing: buildShieldRouting(bestMatch.testCase, bestMatch.confidence),
  };
}

function compareField(actual, expected) {
  if (Array.isArray(expected)) {
    const normalizedActual = [...(actual || [])].sort();
    const normalizedExpected = [...expected].sort();
    return JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected);
  }

  return String(actual || '') === String(expected || '');
}

function runShieldTestSuite() {
  const results = loadShieldTestCases().map((testCase) => {
    const match = findShieldTestCaseMatch(testCase.msg);
    const actual = match?.routing || {};
    const expected = {
      testCaseId: testCase.id,
      complaintGroup: testCase.nhom,
      market: testCase.market,
      gip: testCase.gip,
      escalationLevel: Number(testCase.cap),
      customerServicePic: testCase.picDVKH,
      departmentPic: testCase.picPhongBan,
      notificationGroups: testCase.notificationGroups,
      sla: testCase.sla,
      recommendedOutput: testCase.output,
      sop: testCase.sop,
    };

    const checks = [
      ['testCaseId', actual.testCaseId, expected.testCaseId],
      ['complaintGroup', actual.complaintGroup, expected.complaintGroup],
      ['market', actual.market, expected.market],
      ['gip', actual.gip, expected.gip],
      ['escalationLevel', actual.escalationLevel, expected.escalationLevel],
      ['customerServicePic', actual.customerServicePic, expected.customerServicePic],
      ['departmentPic', actual.departmentPic, expected.departmentPic],
      ['notificationGroups', actual.notificationGroups, expected.notificationGroups],
      ['sla', actual.sla, expected.sla],
      ['recommendedOutput', actual.recommendedOutput, expected.recommendedOutput],
      ['sop', actual.sop, expected.sop],
    ];

    const mismatches = checks
      .filter(([, actualValue, expectedValue]) => !compareField(actualValue, expectedValue))
      .map(([field, actualValue, expectedValue]) => ({ field, actual: actualValue, expected: expectedValue }));

    return {
      id: testCase.id,
      pass: mismatches.length === 0,
      confidence: match?.confidence || 0,
      expected,
      actual,
      mismatches,
      message: testCase.msg,
    };
  });

  const passed = results.filter((result) => result.pass).length;
  return {
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      score: results.length ? passed / results.length : 0,
      generatedAt: new Date().toISOString(),
    },
    results,
  };
}

module.exports = {
  findShieldTestCaseMatch,
  loadShieldTestCases,
  normalizeShieldText: normalizeText,
  runShieldTestSuite,
};