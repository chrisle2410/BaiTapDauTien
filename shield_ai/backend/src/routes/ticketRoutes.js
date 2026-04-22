const express = require('express');
const multer = require('multer');
const { analyzeTicket } = require('../../../services/geminiService');
const { sendToMake } = require('../../../services/makeWebhookService');
const { buildTicketPayload } = require('../../../services/ticketUtils');
const { listTickets, savePendingAnalysis, getPendingAnalysisById, saveTicket, updateTicketStatus } = require('../../../services/ticketStore');
const { loadServiceCatalog } = require('../../../services/serviceCatalog');
const { importServiceCatalog, loadStandardizedCatalog, parseServiceCatalog, normalizeCatalog } = require('../../../services/catalogImportService');
const { isSheetsConfigured, upsertTicketToSheet, scanDueTicketsFromSheet, syncTicketsToSheet } = require('../../../services/googleSheetService');
const { loadShieldTestCases, runShieldTestSuite } = require('../../../services/shieldAnalysisService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (_request, response) => {
  response.json({ tickets: listTickets() });
});

router.get('/catalog', (_request, response) => {
  response.json({ catalog: loadServiceCatalog() });
});

router.get('/sheet/config', (_request, response) => {
  response.json({ configured: isSheetsConfigured() });
});

router.get('/sheet/due-scan', async (request, response) => {
  try {
    const result = await scanDueTicketsFromSheet({ windowMinutes: request.query.windowMinutes || 60 });
    response.json(result);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

router.post('/sheet/sync', async (_request, response) => {
  try {
    const tickets = listTickets();
    const results = await syncTicketsToSheet(tickets);
    response.json({ synced: results.length, results, syncedAt: new Date().toISOString() });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

router.get('/catalog/standardized', (_request, response) => {
  response.json(loadStandardizedCatalog());
});

router.get('/tests/cases', (_request, response) => {
  response.json({ cases: loadShieldTestCases() });
});

router.post('/tests/run', (_request, response) => {
  response.json(runShieldTestSuite());
});

router.post('/catalog/parse', async (request, response) => {
  try {
    const parsedCatalog = await parseServiceCatalog(request.body);
    const normalizedCatalog = normalizeCatalog(parsedCatalog);
    response.json({ parsedCatalog, normalizedCatalog });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

router.post('/catalog/import', upload.single('catalogFile'), async (request, response) => {
  try {
    const source = request.file
      ? {
          sourceType: request.body.sourceType,
          fileName: request.file.originalname,
          mimeType: request.file.mimetype,
          buffer: request.file.buffer,
        }
      : {
          sourceType: request.body.sourceType,
          url: request.body.url,
          content: request.body.content,
          filePath: request.body.filePath,
          fileName: request.body.fileName,
        };

    const normalizedCatalog = await importServiceCatalog(source);
    response.status(201).json({
      catalog: loadServiceCatalog(),
      standardizedCatalog: normalizedCatalog,
      message: `Imported ${normalizedCatalog.meta.rowCount} catalog rows successfully.`,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

router.post('/analyze', async (request, response) => {
  try {
    const { message, telegramUser = 'dashboard-user', telegramChatId = '' } = request.body;
    if (!message) {
      return response.status(400).json({ error: 'message is required' });
    }

    const analysis = await analyzeTicket(message, {
      telegramUser,
      telegramChatId,
      source: 'dashboard',
    });

    savePendingAnalysis(analysis);
    return response.json({ analysis });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
});

router.post('/create', async (request, response) => {
  try {
    const { pendingId, analysis, attachments = [], telegramUser = 'dashboard-user', telegramChatId = '', sendToMakeImmediately = false } = request.body;
    const resolvedAnalysis = pendingId ? getPendingAnalysisById(pendingId) : analysis;

    if (!resolvedAnalysis) {
      return response.status(404).json({ error: 'Analysis not found. Analyze a ticket first.' });
    }

    const ticket = buildTicketPayload(resolvedAnalysis, {
      attachments,
      telegramUser,
      telegramChatId,
      source: 'dashboard',
    });

    saveTicket(ticket);
    const sheetSync = await upsertTicketToSheet(ticket);

    let makeResult = null;
    if (sendToMakeImmediately) {
      makeResult = await sendToMake(ticket);
    }

    return response.status(201).json({ ticket, makeResult, sheetSync });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
});

router.patch('/:ticketId/status', async (request, response) => {
  try {
    const { ticketId } = request.params;
    const { status } = request.body;
    if (!status) {
      return response.status(400).json({ error: 'status is required' });
    }

    const updatedTicket = updateTicketStatus(ticketId, status);
    if (!updatedTicket) {
      return response.status(404).json({ error: 'Ticket not found' });
    }

    const sheetSync = await upsertTicketToSheet(updatedTicket);
    return response.json({ ticket: updatedTicket, sheetSync });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
});

router.post('/send-to-make', async (request, response) => {
  try {
    const { ticketData } = request.body;
    if (!ticketData) {
      return response.status(400).json({ error: 'ticketData is required' });
    }

    const result = await sendToMake(ticketData);
    return response.json({ result });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
});

module.exports = router;
