const express = require('express');
const { getDashboardSummary, listTickets } = require('../../../services/ticketStore');

const router = express.Router();

router.get('/summary', (_request, response) => {
  response.json({
    summary: getDashboardSummary(),
    tickets: listTickets(),
  });
});

module.exports = router;
