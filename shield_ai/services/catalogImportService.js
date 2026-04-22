const fs = require('fs');
const path = require('path');
const axios = require('axios');
const XLSX = require('xlsx');

const catalogPath = path.resolve(__dirname, '../data/serviceCatalog.json');

const COLUMN_ALIASES = {
  service_name: ['service name', 'service', 'name', 'item name', 'service title'],
  service_code: ['service code', 'code', 'service id', 'item code'],
  category: ['category', 'service category', 'group', 'service type', 'domain'],
  keywords: ['keywords', 'keyword', 'tags', 'search terms'],
  pic: ['pic', 'owner', 'team', 'support team', 'assignee', 'resolver', 'person in charge'],
  sop: ['sop', 'procedure', 'resolution guide', 'resolution', 'runbook', 'guide', 'process', 'detail'],
  sla: ['sla', 'response time', 'support time', 'resolution time', 'service level', 'commit', 'turnaround'],
  priority_rules: ['priority rule', 'priority', 'severity', 'urgency', 'impact'],
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatServiceName(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const normalizedPart = normalizeText(part).replace(/[^a-z0-9]/g, '');
      if (/^[a-z]+$/i.test(part) && normalizedPart.length > 1 && normalizedPart.length <= 4) {
        return normalizedPart.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1);
}

function splitKeywords(value) {
  return String(value || '')
    .split(/\r?\n|,|;|\||\//)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function extractRowsFromJson(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.service_catalog)) {
    return payload.service_catalog;
  }

  if (payload && typeof payload === 'object') {
    const firstArray = Object.values(payload).find((value) => Array.isArray(value));
    if (firstArray) {
      return firstArray;
    }
  }

  throw new Error('JSON catalog did not contain an array of rows.');
}

function parseMarkdownTable(content) {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.filter((line) => line.includes('|'));
  if (rows.length < 2) {
    throw new Error('Markdown catalog does not contain a valid table.');
  }

  const headers = rows[0]
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);

  const dataLines = rows.slice(1).filter((line) => !/^\|?\s*[-:]+/.test(line.replace(/\|/g, '')));

  return dataLines.map((line) => {
    const cells = line
      .split('|')
      .map((value) => value.trim())
      .filter((_, index, values) => !(index === 0 && !values[index]) && !(index === values.length - 1 && !values[index]));

    return headers.reduce((accumulator, header, index) => {
      accumulator[header] = cells[index] || '';
      return accumulator;
    }, {});
  });
}

function getRowsFromWorkbook(workbook) {
  const populatedSheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    const filteredRows = rows.filter((row) => Object.values(row).some((value) => String(value || '').trim()));
    const enrichedRows = filteredRows.map((row) => ({ ...row, __sheetName: sheetName }));
    const headers = enrichedRows.length ? Object.keys(enrichedRows[0]) : [];
    return { sheetName, rows: enrichedRows, headers };
  }).filter((sheet) => sheet.rows.length);

  if (!populatedSheets.length) {
    throw new Error('Spreadsheet catalog does not contain any usable rows.');
  }

  return {
    rows: populatedSheets.flatMap((sheet) => sheet.rows),
    headers: Array.from(new Set(populatedSheets.flatMap((sheet) => sheet.headers))),
    sheetName: populatedSheets.map((sheet) => sheet.sheetName).join(', '),
    sheetNames: populatedSheets.map((sheet) => sheet.sheetName),
  };
}

function detectFormat(source = {}) {
  if (source.sourceType) {
    return normalizeText(source.sourceType);
  }

  const fileName = String(source.fileName || source.filePath || source.url || '').toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return 'excel';
  }
  if (fileName.endsWith('.csv')) {
    return 'csv';
  }
  if (fileName.endsWith('.json')) {
    return 'json';
  }
  if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
    return 'markdown';
  }
  if (fileName.includes('docs.google.com/spreadsheets')) {
    return 'google-sheet';
  }

  return 'json';
}

function toGoogleSheetCsvUrl(url) {
  const gidMatch = String(url).match(/gid=(\d+)/i);
  const gid = gidMatch ? gidMatch[1] : '0';
  const cleanedUrl = String(url).split('?')[0].replace(/\/edit.*$/, '');
  return `${cleanedUrl}/export?format=csv&gid=${gid}`;
}

async function parseServiceCatalog(source = {}) {
  const format = detectFormat(source);

  if (format === 'google sheet' || format === 'google-sheet') {
    const response = await axios.get(toGoogleSheetCsvUrl(source.url), { timeout: 15000 });
    const workbook = XLSX.read(response.data, { type: 'string' });
    const parsed = getRowsFromWorkbook(workbook);
    return { ...parsed, sourceType: 'google-sheet' };
  }

  if (source.filePath) {
    source.buffer = fs.readFileSync(path.resolve(source.filePath));
  }

  if (format === 'excel') {
    const workbook = XLSX.read(source.buffer, { type: 'buffer' });
    const parsed = getRowsFromWorkbook(workbook);
    return { ...parsed, sourceType: 'excel' };
  }

  if (format === 'csv') {
    const workbook = XLSX.read(source.buffer ? source.buffer.toString('utf-8') : String(source.content || ''), { type: 'string' });
    const parsed = getRowsFromWorkbook(workbook);
    return { ...parsed, sourceType: 'csv' };
  }

  if (format === 'markdown') {
    const rows = parseMarkdownTable(source.content || source.buffer?.toString('utf-8'));
    return { rows, headers: rows.length ? Object.keys(rows[0]) : [], sourceType: 'markdown', sheetName: 'markdown' };
  }

  const payload = JSON.parse(source.content || source.buffer?.toString('utf-8') || '{}');
  const rows = extractRowsFromJson(payload);
  return { rows, headers: rows.length ? Object.keys(rows[0]) : [], sourceType: 'json', sheetName: 'json' };
}

function detectColumn(headers, targetKey) {
  const aliases = COLUMN_ALIASES[targetKey] || [];
  const ranked = headers
    .map((header) => {
      const normalizedHeader = normalizeText(header);
      const headerTokens = normalizedHeader.split(' ').filter(Boolean);
      let score = 0;
      for (const alias of aliases) {
        const normalizedAlias = normalizeText(alias);
        const aliasTokens = normalizedAlias.split(' ').filter(Boolean);
        if (normalizedHeader === normalizedAlias) {
          score = Math.max(score, 10);
        } else if (aliasTokens.length > 1 && aliasTokens.every((token) => headerTokens.includes(token))) {
          score = Math.max(score, 7);
        } else if (aliasTokens.length === 1) {
          const matchedTokens = aliasTokens.filter((token) => headerTokens.includes(token)).length;
          score = Math.max(score, matchedTokens);
        }
      }
      return { header, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0] && ranked[0].score > 0 ? ranked[0].header : null;
}

function buildColumnMap(headers) {
  const serviceNameColumns = headers
    .filter((header) => /^service name( \d+)?$/.test(normalizeText(header)))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const categoryColumns = headers.filter((header) => ['sheetname', 'service type', 'type', 'category'].includes(normalizeText(header)));

  return {
    service_name: serviceNameColumns[serviceNameColumns.length - 1] || detectColumn(headers, 'service_name'),
    service_name_columns: serviceNameColumns,
    service_code: detectColumn(headers, 'service_code'),
    category: detectColumn(headers, 'category'),
    category_columns: categoryColumns,
    keywords: detectColumn(headers, 'keywords'),
    pic: detectColumn(headers, 'pic'),
    sop: detectColumn(headers, 'sop'),
    sla: detectColumn(headers, 'sla'),
    priority_rules: detectColumn(headers, 'priority_rules'),
  };
}

function buildKeywords(serviceName, category, serviceCode, explicitKeywords = []) {
  const baseName = normalizeText(serviceName);
  const compactName = normalizeText(serviceName).replace(/\b(access|service|support|management|request)\b/g, '').trim() || baseName;
  const serviceTokens = tokenize(compactName);
  const headTerm = serviceTokens.slice(0, 3).join(' ') || compactName;
  const categoryTerm = normalizeText(category);
  const codeTerm = normalizeText(serviceCode);

  const generated = new Set(explicitKeywords.map((keyword) => normalizeText(keyword)).filter(Boolean));

  [
    baseName,
    compactName,
    categoryTerm,
    codeTerm,
    `${headTerm} issue`,
    `${headTerm} error`,
    `cannot access ${headTerm}`,
    `cannot connect ${headTerm}`,
    `support ${headTerm}`,
  ]
    .filter(Boolean)
    .forEach((keyword) => generated.add(keyword));

  if (headTerm.includes('vpn')) {
    ['vpn', 'connect vpn', 'cannot connect vpn', 'vpn error', 'vpn login'].forEach((keyword) => generated.add(keyword));
  }

  if (headTerm.includes('email') || headTerm.includes('mail')) {
    ['email issue', 'cannot send email', 'cannot receive email', 'mail error'].forEach((keyword) => generated.add(keyword));
  }

  return Array.from(generated).filter(Boolean);
}

function buildServiceName(row, columnMap) {
  const hierarchicalNames = (columnMap.service_name_columns || [])
    .map((header) => String(row[header] || '').trim())
    .filter(Boolean);

  if (hierarchicalNames.length) {
    return hierarchicalNames.join(' - ');
  }

  return row[columnMap.service_name] || row.service_name || row.service || row.name || '';
}

function buildCategory(row, columnMap) {
  const categoryParts = (columnMap.category_columns || [])
    .map((header) => String(row[header] || '').trim())
    .filter(Boolean);

  return Array.from(new Set(categoryParts)).join(' / ') || row[columnMap.category] || row.category || 'General';
}

function parseCategoryParts(category) {
  return String(category || '')
    .split('/')
    .map((part) => String(part || '').trim())
    .filter(Boolean);
}

function inferDepartment(category, row = {}) {
  const categoryParts = parseCategoryParts(category).map((part) => normalizeText(part));
  const sheetName = normalizeText(row.__sheetName || row.sheetName || '');
  const departmentToken = categoryParts[categoryParts.length - 1] || sheetName;

  if (departmentToken.includes('tele') && departmentToken.includes('csr')) {
    return 'tele_csr';
  }
  if (departmentToken.includes('telesale')) {
    return 'telesale';
  }
  if (departmentToken === 'csr') {
    return 'csr';
  }
  if (departmentToken === 'kho') {
    return 'kho';
  }
  if (departmentToken === 'kd') {
    return 'kd';
  }
  if (departmentToken === 'kt') {
    return 'kt';
  }

  return departmentToken || 'general';
}

function inferPic(serviceName, category, row = {}) {
  const context = normalizeText([serviceName, category, row.Detail, row.detail, row.Commit, row.commit, row.__sheetName].filter(Boolean).join(' '));
  const department = inferDepartment(category, row);

  if (/agency|ads|pingpong/.test(context)) {
    return 'Agency Operations Team';
  }
  if (/bank|dong tien|top up|tax|thue nop thay|thu phi|tai khoan ngan hang|otp|sim ban dia|phap nhan/.test(context)) {
    return 'Finance Operations Team';
  }
  if (department === 'kho' || /inbound|outbound|return|storage|kho/.test(context)) {
    return 'Warehouse Operations Team';
  }
  if (department === 'kd' || /mua sim|ban tai khoan|seeding|thi truong philippines/.test(context)) {
    return 'Business Development Team';
  }
  if (department === 'kt') {
    return 'Commercial Services Team';
  }
  if (department === 'telesale') {
    return 'Telesales Team';
  }
  if (department === 'tele_csr') {
    return 'Tele-CSR Operations Team';
  }
  if (department === 'csr') {
    return 'Customer Service Team';
  }

  return 'IT Service Desk';
}

function inferPriorityRules(serviceName, category, sla, sop, row = {}) {
  const context = normalizeText([serviceName, category, sla, sop, row.Detail, row.detail, row.Commit, row.commit].filter(Boolean).join(' '));
  const categoryParts = parseCategoryParts(category).map((part) => normalizeText(part));
  const isAdhoc = categoryParts.includes('adhoc');
  const isAdded = categoryParts.includes('added');
  const isBasic = categoryParts.includes('basic');
  const isPremium = categoryParts.includes('premium') || /premium/.test(context);
  const isUrgentFlow = /trong ngay|24h|ngay le|chu nhat|ngoai gio|otp|daily report|failed delivery|rto|van chuyen|outbound calling|don hang|giao hang|chot don/.test(context);
  const isFinancialFlow = /bank|top up|tax|thue nop thay|dong tien|pingpong|tai khoan ngan hang|agency|ads/.test(context);
  const isPlanningWork = /setup|training|template|guideline|reporting|bao cao|crm|sheet/.test(context);

  if (/security breach|fraud|mat tien|that thoat dong tien/.test(context)) {
    return 'Critical - Default Critical priority. Use immediately when the issue causes financial loss, security exposure, or broad operational shutdown.';
  }

  if (isAdhoc || isPremium || isUrgentFlow || isFinancialFlow) {
    return 'High - Default High priority. Raise to Critical if the issue blocks same-day operations, payment flow, OTP access, or a large volume of active customer orders.';
  }

  if (isBasic && isPlanningWork && !/24h|trong ngay|daily report/.test(context)) {
    return 'Low - Default Low priority for planned setup or enablement work. Raise to Medium if timelines slip, and raise to High if go-live or daily operations are blocked.';
  }

  if (isAdded) {
    return 'Medium - Default Medium priority. Raise to High when the request becomes time-sensitive, affects live orders, or requires after-hours coordination.';
  }

  return 'Medium - Default Medium priority. Raise to High if the request impacts live operations, customer commitments, or urgent delivery milestones.';
}

function shouldInferPic(value) {
  return !value || normalizeText(value) === 'unassigned';
}

function shouldInferPriorityRules(value) {
  const normalizedValue = normalizeText(value);
  return !normalizedValue || normalizedValue.startsWith('default medium priority');
}

function normalizeCatalog(parsedCatalog) {
  const headers = parsedCatalog.headers || (parsedCatalog.rows[0] ? Object.keys(parsedCatalog.rows[0]) : []);
  const columnMap = buildColumnMap(headers);

  const standardizedEntries = parsedCatalog.rows
    .map((row) => {
      const serviceName = buildServiceName(row, columnMap);
      if (!String(serviceName || '').trim()) {
        return null;
      }

      const serviceCode = row[columnMap.service_code] || row.service_code || '';
      const category = buildCategory(row, columnMap);
      const rawPic = row[columnMap.pic] || row.pic || row.owner || row.team || '';
      const sop = row[columnMap.sop] || row.Detail || row.detail || row.sop || row.procedure || row['resolution guide'] || 'Follow standard operating procedure.';
      const sla = row[columnMap.sla] || row.Commit || row.commit || row.sla || row['response time'] || row['support time'] || '24h';
      const rawPriorityRules = row[columnMap.priority_rules] || row.priority_rules || row.priority || '';
      const explicitKeywords = splitKeywords(row[columnMap.keywords] || row.keywords || '');
      const inferredPic = inferPic(serviceName, category, row);
      const inferredPriorityRules = inferPriorityRules(serviceName, category, sla, sop, row);

      return {
        service_name: formatServiceName(serviceName),
        category: String(category || 'General').trim(),
        keywords: buildKeywords(serviceName, category, serviceCode, explicitKeywords),
        pic: String(shouldInferPic(rawPic) ? inferredPic : rawPic).trim(),
        sop: String(sop || 'Follow standard operating procedure.').trim(),
        sla: String(sla || '24h').trim() || '24h',
        priority_rules: String(shouldInferPriorityRules(rawPriorityRules) ? inferredPriorityRules : rawPriorityRules).trim(),
      };
    })
    .filter(Boolean);

  const deduplicatedEntries = Array.from(
    standardizedEntries.reduce((accumulator, entry) => {
      const key = `${normalizeText(entry.service_name)}|${normalizeText(entry.category)}`;
      if (!accumulator.has(key)) {
        accumulator.set(key, entry);
      }
      return accumulator;
    }, new Map()).values()
  );

  return {
    service_catalog: deduplicatedEntries,
    meta: {
      importedAt: new Date().toISOString(),
      sourceType: parsedCatalog.sourceType,
      sheetName: parsedCatalog.sheetName || '',
      sheetNames: parsedCatalog.sheetNames || [],
      rowCount: deduplicatedEntries.length,
      columnMap,
    },
  };
}

function derivePriority(priorityRules, ticketMessage) {
  const normalizedRules = normalizeText(priorityRules);
  const normalizedMessage = normalizeText(ticketMessage);

  if (/critical|sev 1|p1/.test(normalizedRules) || /outage|all users|toan bo|security breach|he thong sap|system down/.test(normalizedMessage)) {
    return 'Critical';
  }
  if (/high|urgent|sev 2|p2/.test(normalizedRules) || /khan|gap|cannot connect|khong the|work stoppage|mat ket noi/.test(normalizedMessage)) {
    return 'High';
  }
  if (/low|sev 4|p4/.test(normalizedRules)) {
    return 'Low';
  }
  return /medium|normal|sev 3|p3/.test(normalizedRules) ? 'Medium' : 'Medium';
}

function ensureStandardizedCatalog(payload) {
  if (payload && Array.isArray(payload.service_catalog)) {
    return {
      ...payload,
      service_catalog: payload.service_catalog.map((entry) => ({
        ...entry,
        service_name: formatServiceName(entry.service_name || entry.service || ''),
        keywords: Array.isArray(entry.keywords) ? entry.keywords.map((keyword) => normalizeText(keyword)).filter(Boolean) : buildKeywords(entry.service_name || entry.service || '', entry.category || '', '', splitKeywords(entry.keywords || '')),
        category: String(entry.category || 'General').trim(),
        pic: String(shouldInferPic(entry.pic) ? inferPic(entry.service_name || entry.service || '', entry.category || '', entry) : entry.pic).trim(),
        sop: String(entry.sop || 'Follow standard operating procedure.').trim(),
        sla: String(entry.sla || '24h').trim() || '24h',
        priority_rules: String(shouldInferPriorityRules(entry.priority_rules || entry.priority) ? inferPriorityRules(entry.service_name || entry.service || '', entry.category || '', entry.sla || '24h', entry.sop || '', entry) : entry.priority_rules || entry.priority).trim(),
      })),
    };
  }

  if (Array.isArray(payload)) {
    const rows = payload.map((entry) => ({
      service_name: entry.service_name || entry.service || entry.name || '',
      category: entry.category || 'General',
      keywords: Array.isArray(entry.keywords) ? entry.keywords.join(', ') : entry.keywords || '',
      pic: entry.pic || entry.owner || entry.team || 'Unassigned',
      sop: entry.sop || entry.procedure || 'Follow standard operating procedure.',
      sla: entry.sla || '24h',
      priority_rules: entry.priority_rules || entry.priority || 'Default Medium priority.',
      service_code: entry.service_code || entry.code || '',
    }));

    return normalizeCatalog({ rows, headers: rows.length ? Object.keys(rows[0]) : [], sourceType: 'json', sheetName: 'json' });
  }

  return { service_catalog: [], meta: {} };
}

function loadStandardizedCatalog() {
  const raw = fs.readFileSync(catalogPath, 'utf-8');
  const payload = JSON.parse(raw);
  return ensureStandardizedCatalog(payload);
}

function saveStandardizedCatalog(standardizedCatalog) {
  fs.writeFileSync(catalogPath, JSON.stringify(standardizedCatalog, null, 2));
  return standardizedCatalog;
}

function matchService(ticketMessage, standardizedCatalog = loadStandardizedCatalog()) {
  const message = normalizeText(ticketMessage);
  const messageTokens = new Set(tokenize(message));
  let bestEntry = null;
  let bestScore = 0;
  let matchedKeywords = [];

  for (const entry of standardizedCatalog.service_catalog || []) {
    let score = 0;
    const hits = [];

    for (const keyword of entry.keywords || []) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) {
        continue;
      }
      if (message.includes(normalizedKeyword)) {
        score += 4 + Math.min(3, normalizedKeyword.split(' ').length);
        hits.push(keyword);
        continue;
      }

      const keywordTokens = tokenize(normalizedKeyword);
      const overlap = keywordTokens.filter((token) => messageTokens.has(token)).length;
      if (overlap > 0) {
        score += overlap;
        hits.push(keyword);
      }
    }

    const serviceTokens = tokenize(entry.service_name);
    const matchedServiceTokens = serviceTokens.filter((token) => messageTokens.has(token));
    score += matchedServiceTokens.length * 2;
    matchedServiceTokens.forEach((token) => hits.push(token));

    const matchedCategoryTokens = tokenize(entry.category).filter((token) => messageTokens.has(token));
    score += matchedCategoryTokens.length;
    matchedCategoryTokens.forEach((token) => hits.push(token));

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
      matchedKeywords = Array.from(new Set(hits));
    }
  }

  const entry = bestEntry || standardizedCatalog.service_catalog[0] || null;
  if (!entry) {
    return {
      service: 'General IT Support',
      category: 'General',
      priority: 'Medium',
      pic: 'IT Service Desk',
      sop: 'Follow standard triage procedure.',
      sla: '24h',
      priority_rules: 'Default Medium priority.',
      matchedKeywords: [],
      confidence: 0.3,
    };
  }

  return {
    service: entry.service_name,
    category: entry.category,
    priority: derivePriority(entry.priority_rules, ticketMessage),
    pic: entry.pic,
    sop: entry.sop,
    sla: entry.sla || '24h',
    priority_rules: entry.priority_rules,
    matchedKeywords,
    confidence: bestScore > 0 ? Math.min(0.96, 0.45 + bestScore * 0.04) : 0.35,
  };
}

function buildCatalogPreview(standardizedCatalog = loadStandardizedCatalog()) {
  return (standardizedCatalog.service_catalog || []).map((entry) => ({
    service: entry.service_name,
    category: entry.category,
    priority: derivePriority(entry.priority_rules, ''),
    priorityRules: entry.priority_rules,
    pic: entry.pic,
    sop: entry.sop,
    sla: entry.sla,
    keywords: entry.keywords,
  }));
}

async function importServiceCatalog(source) {
  const parsedCatalog = await parseServiceCatalog(source);
  const normalizedCatalog = normalizeCatalog(parsedCatalog);
  saveStandardizedCatalog(normalizedCatalog);
  return normalizedCatalog;
}

module.exports = {
  parseServiceCatalog,
  normalizeCatalog,
  matchService,
  importServiceCatalog,
  loadStandardizedCatalog,
  buildCatalogPreview,
  ensureStandardizedCatalog,
};