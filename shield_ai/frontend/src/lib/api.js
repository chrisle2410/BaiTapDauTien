import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 15000,
});

export async function fetchDashboard() {
  const response = await api.get('/dashboard/summary');
  return response.data;
}

export async function analyzeTicket(payload) {
  const response = await api.post('/tickets/analyze', payload);
  return response.data.analysis;
}

export async function createTicket(payload) {
  const response = await api.post('/tickets/create', payload);
  return response.data;
}

export async function updateTicketStatus(ticketId, status) {
  const response = await api.patch(`/tickets/${ticketId}/status`, { status });
  return response.data;
}

export async function scanDueTickets(windowMinutes = 60) {
  const response = await api.get(`/tickets/sheet/due-scan?windowMinutes=${windowMinutes}`);
  return response.data;
}

export async function syncTicketsToGoogleSheet() {
  const response = await api.post('/tickets/sheet/sync', {}, { timeout: 60000 });
  return response.data;
}

export async function sendToMake(ticketData) {
  const response = await api.post('/tickets/send-to-make', { ticketData });
  return response.data.result;
}

export async function fetchCatalog() {
  const response = await api.get('/tickets/catalog');
  return response.data.catalog;
}

export async function runShieldTestSuite() {
  const response = await api.post('/tickets/tests/run');
  return response.data;
}

export async function importCatalog({ file, url, content, sourceType }) {
  if (file) {
    const formData = new FormData();
    formData.append('catalogFile', file);
    if (sourceType) {
      formData.append('sourceType', sourceType);
    }

    const response = await api.post('/tickets/catalog/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  const response = await api.post('/tickets/catalog/import', {
    url,
    content,
    sourceType,
  });
  return response.data;
}

export default api;
