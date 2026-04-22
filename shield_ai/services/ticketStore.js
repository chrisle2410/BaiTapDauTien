const fs = require('fs');
const path = require('path');

const ticketsPath = path.resolve(__dirname, '../data/tickets.json');
const pendingPath = path.resolve(__dirname, '../data/pending-analyses.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return raw ? JSON.parse(raw) : [];
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function listTickets() {
  return readJson(ticketsPath).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function saveTicket(ticket) {
  const tickets = listTickets().filter((item) => item.ticketId !== ticket.ticketId);
  tickets.unshift(ticket);
  writeJson(ticketsPath, tickets);
  return ticket;
}

function getTicketById(ticketId) {
  return listTickets().find((ticket) => ticket.ticketId === ticketId);
}

function updateTicketStatus(ticketId, status) {
  const normalizedStatus = String(status || '').toUpperCase();
  const allowedStatuses = ['OPEN', 'IN PROGRESS', 'RESOLVED'];

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new Error(`Unsupported ticket status: ${status}`);
  }

  const tickets = listTickets();
  const ticketIndex = tickets.findIndex((ticket) => ticket.ticketId === ticketId);
  if (ticketIndex === -1) {
    return null;
  }

  const existingTicket = tickets[ticketIndex];
  const updatedTicket = {
    ...existingTicket,
    status: normalizedStatus,
    updatedAt: new Date().toISOString(),
    resolvedAt: normalizedStatus === 'RESOLVED' ? new Date().toISOString() : existingTicket.resolvedAt || '',
  };

  tickets[ticketIndex] = updatedTicket;
  writeJson(ticketsPath, tickets);
  return updatedTicket;
}

function savePendingAnalysis(analysis) {
  const pendingItems = readJson(pendingPath).filter((item) => item.pendingId !== analysis.pendingId);
  pendingItems.unshift(analysis);
  writeJson(pendingPath, pendingItems);
  return analysis;
}

function getPendingAnalysisByChatId(chatId) {
  return readJson(pendingPath).find((item) => item.telegramChatId === String(chatId));
}

function getPendingAnalysisById(pendingId) {
  return readJson(pendingPath).find((item) => item.pendingId === pendingId);
}

function clearPendingAnalysis(pendingId) {
  const pendingItems = readJson(pendingPath).filter((item) => item.pendingId !== pendingId);
  writeJson(pendingPath, pendingItems);
}

function getDashboardSummary() {
  const tickets = listTickets();
  const now = Date.now();

  return {
    totalTickets: tickets.length,
    openTickets: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    inProgressTickets: tickets.filter((ticket) => ticket.status === 'IN PROGRESS').length,
    resolvedTickets: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    slaBreached: tickets.filter((ticket) => ticket.status !== 'RESOLVED' && new Date(ticket.slaDeadline).getTime() < now).length,
    byService: tickets.reduce((accumulator, ticket) => {
      accumulator[ticket.service] = (accumulator[ticket.service] || 0) + 1;
      return accumulator;
    }, {}),
  };
}

module.exports = {
  listTickets,
  saveTicket,
  getTicketById,
  updateTicketStatus,
  savePendingAnalysis,
  getPendingAnalysisByChatId,
  getPendingAnalysisById,
  clearPendingAnalysis,
  getDashboardSummary,
};
