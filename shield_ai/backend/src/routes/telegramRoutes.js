const express = require('express');
const { processTelegramUpdate } = require('../../../services/telegramService');

const router = express.Router();

router.post('/webhook', async (request, response) => {
  try {
    const result = await processTelegramUpdate(request.body);
    response.json(result);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

module.exports = router;
