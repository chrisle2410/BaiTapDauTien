import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import SectionCard from './components/SectionCard';
import TicketTable from './components/TicketTable';
import CatalogTable from './components/CatalogTable';
import AnalysisSummary from './components/AnalysisSummary';
import TopBar from './components/TopBar';
import { navigationItems } from './data/navigation';
import { analyzeTicket, createTicket, fetchCatalog, fetchDashboard, importCatalog, runShieldTestSuite, scanDueTickets, sendToMake, syncTicketsToGoogleSheet, updateTicketStatus } from './lib/api';

const legacyRoutes = {
  '/analysis': '/incident-analysis',
  '/database': '/ticket-management',
  '/sla': '/sla-monitoring',
  '/catalog': '/service-catalog',
};

const LAST_SHEET_SYNC_STORAGE_KEY = 'shield-ai:last-sheet-sync-at';

const moduleContent = {
  dashboard: {
    eyebrow: 'Overview',
    title: 'AI Operations Dashboard',
    description: 'Bảng điều hành hợp nhất cho incident triage, queue realtime, trạng thái AI agent và cảnh báo SLA.',
  },
  analysis: {
    eyebrow: 'Incident Analysis',
    title: 'AI Incident Triage Workspace',
    description: 'Chuẩn hóa message đầu vào, để AI suy luận service, priority, PIC, SOP và SLA trước khi phát hành ticket.',
  },
  catalog: {
    eyebrow: 'Catalog',
    title: 'Service Catalog Control',
    description: 'Kiểm soát nguồn service catalog, import nhiều định dạng, lọc theo department và rà soát logic routing.',
  },
  agents: {
    eyebrow: 'Agents',
    title: 'AI Agent Mesh',
    description: 'Theo dõi các tác nhân phân tích, định tuyến, đồng bộ sheet và giám sát SLA trong cùng một màn.',
  },
  database: {
    eyebrow: 'Tickets',
    title: 'Realtime Ticket Management',
    description: 'Quản lý toàn bộ vòng đời ticket với trạng thái realtime, ưu tiên xử lý và bộ đếm SLA ngay trong bảng.',
  },
  sla: {
    eyebrow: 'SLA',
    title: 'SLA Monitoring Center',
    description: 'Giám sát ticket tới hạn, dữ liệu due scan từ Google Sheets và các tín hiệu rủi ro xử lý.',
  },
  analytics: {
    eyebrow: 'Analytics',
    title: 'Operational Analytics',
    description: 'Hiển thị xu hướng ticket, phân bổ mức ưu tiên và khối lượng dịch vụ để định hướng vận hành.',
  },
  settings: {
    eyebrow: 'Settings',
    title: 'System Settings',
    description: 'Xem nhanh trạng thái tích hợp và các khóa cấu hình cần thiết cho pipeline vận hành.',
  },
};

function parseCatalogCategory(category) {
  const parts = String(category || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    group: parts[0] || 'General',
    serviceType: parts.length >= 3 ? parts[1] : parts.length === 2 ? parts[0] : 'General',
    department: parts.length >= 2 ? parts[parts.length - 1] : parts[0] || 'General',
  };
}

function getNavItemByPath(pathname) {
  const normalizedPath = String(pathname || '/').replace(/\/+$/, '') || '/';
  return navigationItems.find((item) => item.path === normalizedPath) || navigationItems[0];
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [telegramUser, setTelegramUser] = useState('cs_operator');
  const [dashboard, setDashboard] = useState({ summary: null, tickets: [] });
  const [catalog, setCatalog] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [ticketResult, setTicketResult] = useState(null);
  const [makeResult, setMakeResult] = useState(null);
  const [catalogFile, setCatalogFile] = useState(null);
  const [catalogSourceUrl, setCatalogSourceUrl] = useState('');
  const [catalogImportNotice, setCatalogImportNotice] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogDepartment, setCatalogDepartment] = useState('all');
  const [catalogServiceType, setCatalogServiceType] = useState('all');
  const [dueScan, setDueScan] = useState({ configured: false, dueTickets: [] });
  const [updatingTicketId, setUpdatingTicketId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [isRunningShieldTests, setIsRunningShieldTests] = useState(false);
  const [lastSheetSyncAt, setLastSheetSyncAt] = useState(() => window.localStorage.getItem(LAST_SHEET_SYNC_STORAGE_KEY) || '');
  const [shieldTestSuite, setShieldTestSuite] = useState(null);
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const activeItem = getNavItemByPath(location.pathname);

  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function hydrate() {
    const [dashboardResult, catalogResult] = await Promise.allSettled([fetchDashboard(), fetchCatalog()]);

    if (dashboardResult.status === 'fulfilled') {
      setDashboard(dashboardResult.value);
    }

    if (catalogResult.status === 'fulfilled') {
      setCatalog(catalogResult.value);
    }

    try {
      const dueResult = await scanDueTickets(180);
      setDueScan(dueResult);
    } catch (error) {
      setDueScan({ configured: false, dueTickets: [] });
    }

    const errorMessage = [dashboardResult, catalogResult]
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason?.response?.data?.error || result.reason?.message)
      .filter(Boolean)
      .join(' | ');

    setNotice(errorMessage || '');
  }

  async function handleAnalyze() {
    setIsLoading(true);
    setNotice('');
    try {
      const result = await analyzeTicket({ message, telegramUser });
      setAnalysis(result);
      setTicketResult(null);
      setMakeResult(null);
      setToast({ type: 'success', message: 'AI analysis completed.' });
    } catch (error) {
      setNotice(error.response?.data?.error || error.message || 'Không phân tích được ticket.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTicket() {
    if (!analysis) {
      setNotice('Bạn cần phân tích ticket trước khi tạo ticket.');
      return;
    }

    setIsLoading(true);
    setNotice('');
    try {
      const result = await createTicket({ analysis, attachments, telegramUser, sendToMakeImmediately: false });
      setTicketResult(result);
      setAttachments([]);
      setToast({ type: 'success', message: `Ticket ${result.ticket?.ticketId || ''} created successfully.` });
      await hydrate();
      navigate('/ticket-management');
    } catch (error) {
      setNotice(error.response?.data?.error || error.message || 'Không tạo được ticket.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendToMake() {
    const payload = ticketResult?.ticket || (analysis ? { ...analysis, ticketId: 'PENDING-CREATE', status: 'OPEN', createdAt: new Date().toISOString() } : null);
    if (!payload) {
      setNotice('Chưa có dữ liệu ticket để gửi qua Make.');
      return;
    }

    setIsLoading(true);
    setNotice('');
    try {
      const result = await sendToMake(payload);
      setMakeResult(result);
      setToast({ type: 'success', message: result.delivered ? 'Payload sent to Make.' : 'Mock payload prepared for Make.' });
    } catch (error) {
      setNotice(error.response?.data?.error || error.message || 'Không gửi được dữ liệu sang Make.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImportCatalog() {
    if (!catalogFile && !catalogSourceUrl.trim()) {
      setCatalogImportNotice('Hãy chọn file catalog hoặc nhập Google Sheet URL trước khi import.');
      return;
    }

    setIsLoading(true);
    setCatalogImportNotice('');
    setNotice('');

    try {
      const result = await importCatalog({
        file: catalogFile,
        url: catalogSourceUrl.trim(),
        sourceType: catalogFile ? undefined : 'google-sheet',
      });

      setCatalog(result.catalog || []);
      setCatalogImportNotice(result.message || 'Đã import catalog thành công.');
      setCatalogFile(null);
      setCatalogSourceUrl('');
      setToast({ type: 'success', message: 'Service catalog imported.' });
    } catch (error) {
      setCatalogImportNotice(error.response?.data?.error || error.message || 'Không import được service catalog.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(ticketId, status) {
    setUpdatingTicketId(ticketId);
    setNotice('');
    try {
      await updateTicketStatus(ticketId, status);
      await hydrate();
      setToast({ type: 'success', message: `Ticket ${ticketId} updated to ${status}.` });
    } catch (error) {
      setNotice(error.response?.data?.error || error.message || 'Không cập nhật được trạng thái ticket.');
    } finally {
      setUpdatingTicketId('');
    }
  }

  async function handleSyncGoogleSheet() {
    setIsSyncingSheet(true);
    setNotice('');
    try {
      const result = await syncTicketsToGoogleSheet();
      const nextSyncedAt = result.syncedAt || new Date().toISOString();
      setLastSheetSyncAt(nextSyncedAt);
      window.localStorage.setItem(LAST_SHEET_SYNC_STORAGE_KEY, nextSyncedAt);
      await hydrate();
      setToast({ type: 'success', message: `Synced ${result.synced || 0} tickets to Google Ticket Sheet.` });
    } catch (error) {
      setNotice(error.response?.data?.error || error.message || 'Không đồng bộ được ticket lên Google Sheets.');
    } finally {
      setIsSyncingSheet(false);
    }
  }

  async function handleRunShieldTests() {
    setIsRunningShieldTests(true);
    setNotice('');
    try {
      const result = await runShieldTestSuite();
      setShieldTestSuite(result);
      setToast({ type: 'success', message: `SHIELD suite: ${result.summary.passed}/${result.summary.total} cases passed.` });
    } catch (error) {
      setNotice(error.response?.data?.error || error.message || 'Không chạy được SHIELD test suite.');
    } finally {
      setIsRunningShieldTests(false);
    }
  }

  function handleExportShieldSuiteCsv() {
    if (!shieldTestSuite?.results?.length) {
      setNotice('Hãy chạy SHIELD test suite trước khi export CSV.');
      return;
    }

    const csv = buildShieldSuiteCsv(shieldTestSuite);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `shield-suite-${stamp}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    setToast({ type: 'success', message: 'SHIELD suite CSV exported.' });
  }

  const summary = dashboard.summary || {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    slaBreached: 0,
  };

  const tickets = dashboard.tickets || [];
  const normalizedGlobalSearch = globalSearch.trim().toLowerCase();
  const filteredTickets = tickets.filter((ticket) => {
    const haystack = [ticket.ticketId, ticket.customerMessage, ticket.service, ticket.priority, ticket.pic, ticket.status, ticket.sla].join(' ').toLowerCase();
    return !normalizedGlobalSearch || haystack.includes(normalizedGlobalSearch);
  });

  const catalogMeta = catalog.map((entry) => ({ ...entry, meta: parseCatalogCategory(entry.category) }));
  const departmentOptions = Array.from(new Set(catalogMeta.map((entry) => entry.meta.department))).sort((left, right) => left.localeCompare(right));
  const serviceTypeOptions = Array.from(new Set(catalogMeta.map((entry) => entry.meta.serviceType))).sort((left, right) => left.localeCompare(right));
  const normalizedCatalogQuery = `${catalogQuery} ${globalSearch}`.trim().toLowerCase();
  const filteredCatalog = catalogMeta.filter((entry) => {
    const matchesDepartment = catalogDepartment === 'all' || entry.meta.department === catalogDepartment;
    const matchesServiceType = catalogServiceType === 'all' || entry.meta.serviceType === catalogServiceType;
    const haystack = [entry.service, entry.category, entry.pic, entry.sop, entry.sla, entry.priorityRules].join(' ').toLowerCase();
    const matchesQuery = !normalizedCatalogQuery || haystack.includes(normalizedCatalogQuery);
    return matchesDepartment && matchesServiceType && matchesQuery;
  });

  const slaTickets = [...filteredTickets]
    .sort((left, right) => new Date(left.slaDeadline || left.createdAt).getTime() - new Date(right.slaDeadline || right.createdAt).getTime())
    .slice(0, 8);
  const dueTickets = dueScan.dueTickets || [];
  const activeTickets = summary.openTickets + summary.inProgressTickets;
  const resolvedToday = tickets.filter((ticket) => ticket.status === 'RESOLVED' && isToday(ticket.updatedAt || ticket.createdAt)).length;
  const analysisQueue = Math.max(summary.openTickets - summary.inProgressTickets, 0);
  const moduleInfo = moduleContent[activeItem.id] || moduleContent.dashboard;
  const recentTickets = [...filteredTickets].slice(0, 6);

  return (
    <div className="min-h-screen bg-haze px-4 py-4 md:px-6 xl:px-8">
      <div className="mx-auto flex max-w-[1680px] gap-5">
        <div className={`${sidebarCollapsed ? 'w-[98px]' : 'w-[292px]'} hidden shrink-0 xl:block`}>
          <Sidebar
            activeSection={activeItem.id}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
            onSelectSection={(sectionId) => {
              const nextItem = navigationItems.find((item) => item.id === sectionId);
              navigate(nextItem?.path || '/dashboard');
            }}
          />
        </div>

        <main className="min-w-0 flex-1 space-y-5">
          <TopBar
            activeModule={moduleInfo.title}
            searchValue={globalSearch}
            onSearchChange={setGlobalSearch}
            notificationCount={dueTickets.length || 1}
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          />

          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#151515] to-[#0f0f0f] px-6 py-7 shadow-panel">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.34em] text-zinc-500">{moduleInfo.eyebrow}</p>
                <h1 className="mt-3 font-display text-4xl font-extrabold text-white md:text-5xl">{moduleInfo.title}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{moduleInfo.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[380px]">
                <QuickMetric label="Live Queue" value={`${activeTickets} tickets`} />
                <QuickMetric label="Catalog Coverage" value={`${catalog.length} services`} />
              </div>
            </div>
          </section>

          {notice ? <AlertBanner message={notice} /> : null}

          <div className="xl:hidden">
            <Sidebar
              activeSection={activeItem.id}
              collapsed={false}
              onToggleCollapsed={() => {}}
              onSelectSection={(sectionId) => {
                const nextItem = navigationItems.find((item) => item.id === sectionId);
                navigate(nextItem?.path || '/dashboard');
              }}
            />
          </div>

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {Object.entries(legacyRoutes).map(([path, nextPath]) => (
              <Route key={path} path={path} element={<Navigate to={nextPath} replace />} />
            ))}
            <Route
              path="/dashboard"
              element={
                <DashboardModule
                  isLoading={isLoading}
                  message={message}
                  telegramUser={telegramUser}
                  summary={summary}
                  dueScan={dueScan}
                  analysis={analysis}
                  attachments={attachments}
                  ticketResult={ticketResult}
                  makeResult={makeResult}
                  tickets={recentTickets}
                  activeTickets={activeTickets}
                  analysisQueue={analysisQueue}
                  resolvedToday={resolvedToday}
                  onMessageChange={setMessage}
                  onAttachmentsChange={setAttachments}
                  onTelegramUserChange={setTelegramUser}
                  onAnalyze={handleAnalyze}
                  onCreateTicket={handleCreateTicket}
                  onSendToMake={handleSendToMake}
                  onSyncGoogleSheet={handleSyncGoogleSheet}
                  isSyncingSheet={isSyncingSheet}
                  lastSheetSyncAt={lastSheetSyncAt}
                  onStatusChange={handleStatusChange}
                  updatingTicketId={updatingTicketId}
                />
              }
            />
            <Route
              path="/incident-analysis"
              element={
                <AnalysisModule
                  isLoading={isLoading}
                  message={message}
                  telegramUser={telegramUser}
                  analysis={analysis}
                  attachments={attachments}
                  ticketResult={ticketResult}
                  makeResult={makeResult}
                  onMessageChange={setMessage}
                  onAttachmentsChange={setAttachments}
                  onTelegramUserChange={setTelegramUser}
                  onAnalyze={handleAnalyze}
                  onCreateTicket={handleCreateTicket}
                  onSendToMake={handleSendToMake}
                />
              }
            />
            <Route path="/ticket-management" element={<DatabaseModule summary={summary} tickets={filteredTickets} onStatusChange={handleStatusChange} updatingTicketId={updatingTicketId} onSyncGoogleSheet={handleSyncGoogleSheet} isSyncingSheet={isSyncingSheet} lastSheetSyncAt={lastSheetSyncAt} />} />
            <Route path="/sla-monitoring" element={<SlaModule summary={summary} tickets={slaTickets} dueScan={dueScan} onStatusChange={handleStatusChange} updatingTicketId={updatingTicketId} />} />
            <Route
              path="/service-catalog"
              element={
                <CatalogModule
                  isLoading={isLoading}
                  catalogFile={catalogFile}
                  catalogSourceUrl={catalogSourceUrl}
                  catalogImportNotice={catalogImportNotice}
                  catalogQuery={catalogQuery}
                  catalogDepartment={catalogDepartment}
                  catalogServiceType={catalogServiceType}
                  departmentOptions={departmentOptions}
                  serviceTypeOptions={serviceTypeOptions}
                  catalog={catalog}
                  filteredCatalog={filteredCatalog}
                  onCatalogFileChange={setCatalogFile}
                  onCatalogSourceUrlChange={setCatalogSourceUrl}
                  onCatalogQueryChange={setCatalogQuery}
                  onCatalogDepartmentChange={setCatalogDepartment}
                  onCatalogServiceTypeChange={setCatalogServiceType}
                  onImportCatalog={handleImportCatalog}
                  onResetFilters={() => {
                    setCatalogQuery('');
                    setCatalogDepartment('all');
                    setCatalogServiceType('all');
                  }}
                />
              }
            />
            <Route path="/ai-agents" element={<AgentsModule dueScan={dueScan} summary={summary} />} />
            <Route path="/analytics" element={<AnalyticsModule tickets={filteredTickets} catalog={filteredCatalog} shieldTestSuite={shieldTestSuite} isRunningShieldTests={isRunningShieldTests} onRunShieldTests={handleRunShieldTests} onExportShieldSuiteCsv={handleExportShieldSuiteCsv} />} />
            <Route path="/settings" element={<SettingsModule dueScan={dueScan} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </div>
  );
}

function DashboardModule({
  isLoading,
  message,
  telegramUser,
  summary,
  dueScan,
  analysis,
  attachments,
  ticketResult,
  makeResult,
  tickets,
  activeTickets,
  analysisQueue,
  resolvedToday,
  onMessageChange,
  onAttachmentsChange,
  onTelegramUserChange,
  onAnalyze,
  onCreateTicket,
  onSendToMake,
  onSyncGoogleSheet,
  isSyncingSheet,
  lastSheetSyncAt,
  onStatusChange,
  updatingTicketId,
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard label="Active Tickets" value={activeTickets} accent="bg-red-500/12 text-red-400" detail="Open and in-progress workload requiring attention." icon={<PulseIcon />} />
        <StatCard label="SLA Status" value={summary.slaBreached} accent="bg-orange-500/12 text-orange-300" detail="Tickets already beyond committed deadline." icon={<TimerIcon />} />
        <StatCard label="AI Analysis Queue" value={analysisQueue} accent="bg-white/5 text-zinc-100" detail="Incidents still waiting for deeper triage routing." icon={<SparkIcon />} />
        <StatCard label="Resolved Today" value={resolvedToday} accent="bg-emerald-500/12 text-emerald-300" detail="Resolved tickets detected in the current local day." icon={<CheckIcon />} />
      </section>

      <div className="grid gap-5 2xl:grid-cols-[1.15fr,0.85fr]">
        <SectionCard eyebrow="AI Incident Panel" title="Incident Analysis Command">
          <IncidentComposer
            isLoading={isLoading}
            message={message}
            telegramUser={telegramUser}
            attachments={attachments}
            onMessageChange={onMessageChange}
            onAttachmentsChange={onAttachmentsChange}
            onTelegramUserChange={onTelegramUserChange}
            onAnalyze={onAnalyze}
            onCreateTicket={onCreateTicket}
            onSendToMake={onSendToMake}
            canCreate={Boolean(analysis)}
          />
          <div className="mt-5">
            <AnalysisSummary analysis={analysis} ticketResult={ticketResult} makeResult={makeResult} />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Live Signals" title="Operations Snapshot">
          <div className="space-y-4">
            <StatusBlock label="Due Tickets In Sheet" value={dueScan.dueTickets?.length || 0} helper={dueScan.configured ? 'Google Sheets due scan online.' : 'Google Sheets is not configured yet.'} />
            <StatusBlock label="Open Tickets" value={summary.openTickets} helper="Pending work not yet picked up by an operator." />
            <StatusBlock label="In Progress" value={summary.inProgressTickets} helper="Active service work being handled right now." />
            <StatusBlock label="Catalog Records" value={summary.totalTickets ? tickets.length : tickets.length} helper="Recent ticket stream shown below for rapid follow-up." />
          </div>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Ticket Queue" title="Recent Tickets" action={<SyncSheetAction onSyncGoogleSheet={onSyncGoogleSheet} isSyncingSheet={isSyncingSheet} lastSheetSyncAt={lastSheetSyncAt} />}>
        <TicketTable tickets={tickets} onStatusChange={onStatusChange} updatingTicketId={updatingTicketId} rowsPerPage={5} />
      </SectionCard>
    </div>
  );
}

function AnalysisModule({
  isLoading,
  message,
  telegramUser,
  analysis,
  attachments,
  ticketResult,
  makeResult,
  onMessageChange,
  onAttachmentsChange,
  onTelegramUserChange,
  onAnalyze,
  onCreateTicket,
  onSendToMake,
}) {
  return (
    <section className="grid gap-5 2xl:grid-cols-[0.95fr,1.05fr]">
      <SectionCard eyebrow="Workspace" title="Incident Intake">
        <IncidentComposer
          isLoading={isLoading}
          message={message}
          telegramUser={telegramUser}
          attachments={attachments}
          onMessageChange={onMessageChange}
          onAttachmentsChange={onAttachmentsChange}
          onTelegramUserChange={onTelegramUserChange}
          onAnalyze={onAnalyze}
          onCreateTicket={onCreateTicket}
          onSendToMake={onSendToMake}
          canCreate={Boolean(analysis)}
        />
      </SectionCard>

      <SectionCard eyebrow="AI Output" title="Structured Incident Result">
        <AnalysisSummary analysis={analysis} ticketResult={ticketResult} makeResult={makeResult} />
      </SectionCard>
    </section>
  );
}

function DatabaseModule({ summary, tickets, onStatusChange, updatingTicketId, onSyncGoogleSheet, isSyncingSheet, lastSheetSyncAt }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard label="Total Tickets" value={summary.totalTickets} accent="bg-white/5 text-zinc-100" detail="Complete ticket inventory created through the dashboard." icon={<TicketsIcon />} />
        <StatCard label="Open" value={summary.openTickets} accent="bg-amber-500/12 text-amber-300" detail="Waiting for assignment or action." icon={<PulseIcon />} />
        <StatCard label="In Progress" value={summary.inProgressTickets} accent="bg-sky-500/12 text-sky-300" detail="Already owned by an operator or queue." icon={<SparkIcon />} />
        <StatCard label="Resolved" value={summary.resolvedTickets} accent="bg-emerald-500/12 text-emerald-300" detail="Completed service requests." icon={<CheckIcon />} />
      </section>

      <SectionCard
        eyebrow="Registry"
        title="Ticket Registry"
        action={<SyncSheetAction onSyncGoogleSheet={onSyncGoogleSheet} isSyncingSheet={isSyncingSheet} lastSheetSyncAt={lastSheetSyncAt} />}
      >
        <TicketTable tickets={tickets} onStatusChange={onStatusChange} updatingTicketId={updatingTicketId} rowsPerPage={8} />
      </SectionCard>
    </div>
  );
}

function SlaModule({ summary, tickets, dueScan, onStatusChange, updatingTicketId }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <StatCard label="Open" value={summary.openTickets} accent="bg-amber-500/12 text-amber-300" detail="Tickets currently consuming SLA capacity." icon={<PulseIcon />} />
        <StatCard label="SLA Risk" value={summary.slaBreached} accent="bg-red-500/12 text-red-300" detail="Tickets already beyond their committed deadline." icon={<TimerIcon />} />
        <StatCard label="Due In Sheet" value={dueScan.dueTickets?.length || 0} accent="bg-white/5 text-zinc-100" detail={dueScan.configured ? 'Google Sheets due scan is returning live data.' : 'Google Sheets chưa được cấu hình.'} icon={<SheetIcon />} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
        <SectionCard eyebrow="Monitoring" title="SLA Automation Rules">
          <div className="space-y-4">
            <InfoPanel title="Upcoming automation" description="Bot có thể quét Google Sheets mỗi 15 phút để cảnh báo Telegram khi ticket sắp chạm SLA hoặc đã quá hạn." />
            <InfoPanel
              title="Google Sheets due scan"
              description={dueScan.configured ? `Due soon or overdue on sheet: ${dueScan.dueTickets?.length || 0}.` : 'Thêm GOOGLE_SHEETS_SPREADSHEET_ID và service account để backend quét ticket đến hạn trực tiếp trên Google Sheets.'}
            />
          </div>
        </SectionCard>

        <SectionCard eyebrow="Queue" title="Nearest SLA Tickets">
          <TicketTable tickets={tickets} onStatusChange={onStatusChange} updatingTicketId={updatingTicketId} rowsPerPage={6} />
        </SectionCard>
      </div>
    </div>
  );
}

function CatalogModule({
  isLoading,
  catalogFile,
  catalogSourceUrl,
  catalogImportNotice,
  catalogQuery,
  catalogDepartment,
  catalogServiceType,
  departmentOptions,
  serviceTypeOptions,
  catalog,
  filteredCatalog,
  onCatalogFileChange,
  onCatalogSourceUrlChange,
  onCatalogQueryChange,
  onCatalogDepartmentChange,
  onCatalogServiceTypeChange,
  onImportCatalog,
  onResetFilters,
}) {
  return (
    <SectionCard eyebrow="Catalog" title="Service Catalog Manager" action={<div className="text-sm text-zinc-500">{catalog.length} records available</div>}>
      <div className="space-y-5">
        <div className="grid gap-4 rounded-[28px] border border-white/10 bg-[#121212] p-5 xl:grid-cols-[1fr,1fr,auto]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-400">Upload catalog file</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.json,.md,.markdown"
              onChange={(event) => onCatalogFileChange(event.target.files?.[0] || null)}
              className="block w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-zinc-200"
            />
            {catalogFile ? <div className="mt-2 text-xs text-zinc-500">Selected: {catalogFile.name}</div> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-400">Google Sheet URL</label>
            <input
              value={catalogSourceUrl}
              onChange={(event) => onCatalogSourceUrlChange(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-red-500"
            />
          </div>
          <div className="flex items-end">
            <ActionButton label="Import Catalog" onClick={onImportCatalog} disabled={isLoading} tone="primary" loading={isLoading} />
          </div>
        </div>

        {catalogImportNotice ? <SuccessBanner message={catalogImportNotice} /> : null}

        <div className="grid gap-4 rounded-[28px] border border-white/10 bg-[#121212] p-5 xl:grid-cols-[1.2fr,0.8fr,0.8fr,auto]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-400">Search catalog</label>
            <input
              value={catalogQuery}
              onChange={(event) => onCatalogQueryChange(event.target.value)}
              placeholder="Tìm theo service, SOP, PIC hoặc SLA"
              className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-red-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-400">Department</label>
            <select
              value={catalogDepartment}
              onChange={(event) => onCatalogDepartmentChange(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-red-500"
            >
              <option value="all">All departments</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-400">Service Type</label>
            <select
              value={catalogServiceType}
              onChange={(event) => onCatalogServiceTypeChange(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-red-500"
            >
              <option value="all">All types</option>
              {serviceTypeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 transition hover:border-red-500/50 hover:bg-red-500/10"
            >
              Reset
            </button>
          </div>
        </div>

        <CatalogTable catalog={filteredCatalog} />
      </div>
    </SectionCard>
  );
}

function AgentsModule({ dueScan, summary }) {
  const agents = [
    { name: 'Incident Router', status: 'Online', detail: 'Maps incoming incidents to the right service and PIC.', tone: 'text-emerald-300' },
    { name: 'SLA Sentinel', status: dueScan.configured ? 'Watching Sheets' : 'Needs Sheet Access', detail: 'Monitors due soon and overdue tickets from Google Sheets.', tone: dueScan.configured ? 'text-sky-300' : 'text-amber-300' },
    { name: 'Ticket Sync Agent', status: summary.totalTickets ? 'Streaming Updates' : 'Idle', detail: 'Keeps local ticket registry aligned with downstream systems.', tone: 'text-red-300' },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {agents.map((agent) => (
        <SectionCard key={agent.name} eyebrow="AI Agent" title={agent.name}>
          <div className="space-y-4">
            <div className={`text-lg font-semibold ${agent.tone}`}>{agent.status}</div>
            <p className="text-sm leading-7 text-zinc-400">{agent.detail}</p>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function AnalyticsModule({ tickets, catalog, shieldTestSuite, isRunningShieldTests, onRunShieldTests, onExportShieldSuiteCsv }) {
  const priorityCounts = ['Critical', 'High', 'Medium', 'Low'].map((priority) => ({
    label: priority,
    value: tickets.filter((ticket) => ticket.priority === priority).length,
  }));
  const serviceCounts = buildTopCounts(tickets.map((ticket) => ticket.service)).slice(0, 5);
  const departmentCounts = buildTopCounts(catalog.map((entry) => entry.meta.department)).slice(0, 5);
  const suiteSummary = shieldTestSuite?.summary;
  const failedCases = (shieldTestSuite?.results || []).filter((result) => !result.pass).slice(0, 6);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard eyebrow="Priority Mix" title="Priority Distribution">
        <MetricList items={priorityCounts} />
      </SectionCard>
      <SectionCard eyebrow="Volume" title="Top Services">
        <MetricList items={serviceCounts} />
      </SectionCard>
      <SectionCard eyebrow="Catalog" title="Top Departments">
        <MetricList items={departmentCounts} />
      </SectionCard>
      <SectionCard eyebrow="Signals" title="Operational Notes">
        <p className="text-sm leading-7 text-zinc-400">Analytics view hiện đang tổng hợp trực tiếp từ ticket registry và service catalog. Khi có thêm dữ liệu lịch sử, màn này có thể mở rộng sang trend line hoặc heatmap.</p>
      </SectionCard>
      <SectionCard
        eyebrow="QA"
        title="SHIELD Test Suite"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton label="Run SHIELD Suite" onClick={onRunShieldTests} disabled={isRunningShieldTests} tone="dark" loading={isRunningShieldTests} />
            <ActionButton label="Export CSV" onClick={onExportShieldSuiteCsv} disabled={!shieldTestSuite?.results?.length || isRunningShieldTests} tone="ghost" />
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-7 text-zinc-400">Chạy trực tiếp 28 case từ file test HTML đã convert vào repo để kiểm tra khả năng map đúng `cấp`, `PIC`, `SLA`, `SOP` và `output` nghiệp vụ.</p>
          {suiteSummary ? (
            <div className="grid gap-4 md:grid-cols-4">
              <StatusBlock label="Total Cases" value={suiteSummary.total} helper="Số test case trong bộ SHIELD hiện tại." />
              <StatusBlock label="Passed" value={suiteSummary.passed} helper="Case pass hoàn toàn trên mọi field được đối chiếu." />
              <StatusBlock label="Failed" value={suiteSummary.failed} helper="Case còn lệch so với QA corpus." />
              <StatusBlock label="Score" value={`${Math.round((suiteSummary.score || 0) * 100)}%`} helper={`Generated at ${formatSyncTime(suiteSummary.generatedAt)}`} />
            </div>
          ) : null}
          {failedCases.length ? (
            <div className="space-y-3">
              {failedCases.map((result) => (
                <div key={result.id} className="rounded-[24px] border border-white/10 bg-[#121212] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{result.id}</div>
                    <div className="text-xs text-zinc-500">Confidence {Math.round((result.confidence || 0) * 100)}%</div>
                  </div>
                  <div className="mt-3 text-sm leading-7 text-zinc-400">{result.message}</div>
                  <div className="mt-3 text-xs text-red-300">{result.mismatches.map((item) => item.field).join(', ')}</div>
                </div>
              ))}
            </div>
          ) : suiteSummary ? (
            <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">All SHIELD cases passed in the current rules engine.</div>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsModule({ dueScan }) {
  const integrations = [
    { name: 'Gemini AI', status: 'Connected in backend flow', helper: 'Used for incident analysis when credentials are available.' },
    { name: 'Google Sheets', status: dueScan.configured ? 'Configured' : 'Awaiting credentials', helper: 'Needed for live due-scan and realtime sheet status sync.' },
    { name: 'Telegram Intake', status: 'Operator workflow ready', helper: 'Dashboard still supports forwarded Telegram ticket intake.' },
    { name: 'Make Automation', status: 'Paused by request', helper: 'Kept available, but current workflow prioritizes sheet sync first.' },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {integrations.map((integration) => (
        <SectionCard key={integration.name} eyebrow="Integration" title={integration.name}>
          <div className="text-lg font-semibold text-white">{integration.status}</div>
          <p className="mt-3 text-sm leading-7 text-zinc-400">{integration.helper}</p>
        </SectionCard>
      ))}
    </div>
  );
}

function IncidentComposer({
  isLoading,
  message,
  telegramUser,
  attachments,
  onMessageChange,
  onAttachmentsChange,
  onTelegramUserChange,
  onAnalyze,
  onCreateTicket,
  onSendToMake,
  canCreate,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-zinc-400">Customer Message</label>
        <textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          rows={9}
          className="w-full rounded-[28px] border border-white/10 bg-[#121212] px-4 py-4 text-sm leading-7 text-zinc-200 outline-none transition focus:border-red-500 focus:bg-[#171717]"
          placeholder="Paste forwarded Telegram message here"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-zinc-400">Telegram Operator</label>
        <input
          value={telegramUser}
          onChange={(event) => onTelegramUserChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#121212] px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-red-500 focus:bg-[#171717]"
          placeholder="username"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AttachmentInput
          label="Upload evidence files"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
          helper="Tải các file nghiệp vụ, log hoặc tài liệu liên quan vào ticket."
          onSelect={(files) => handleAttachmentSelection(files, 'file', attachments, onAttachmentsChange)}
        />
        <AttachmentInput
          label="Upload screenshots or photos"
          accept="image/*"
          helper="Ảnh bằng chứng sẽ được hiển thị ngay trong dashboard ticket."
          onSelect={(files) => handleAttachmentSelection(files, 'image', attachments, onAttachmentsChange)}
        />
      </div>

      <AttachmentPreview attachments={attachments} onRemove={(attachmentId) => onAttachmentsChange(attachments.filter((item) => item.id !== attachmentId))} />

      <div className="flex flex-wrap gap-3">
        <ActionButton label="Analyze Ticket" onClick={onAnalyze} disabled={isLoading || !message.trim()} tone="primary" loading={isLoading} />
        <ActionButton label="Create Ticket" onClick={onCreateTicket} disabled={isLoading || !canCreate} tone="dark" />
        <ActionButton label="Send to Make" onClick={onSendToMake} disabled={isLoading || !canCreate} tone="ghost" />
      </div>
    </div>
  );
}

function QuickMetric({ label, value }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#121212] px-4 py-4">
      <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</div>
      <div className="mt-3 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function AlertBanner({ message }) {
  return <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{message}</div>;
}

function SuccessBanner({ message }) {
  return <div className="rounded-[24px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div>;
}

function StatusBlock({ label, value, helper }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#121212] p-5">
      <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">{label}</div>
      <div className="mt-3 text-3xl font-bold text-white">{value}</div>
      <div className="mt-3 text-sm leading-7 text-zinc-500">{helper}</div>
    </div>
  );
}

function InfoPanel({ title, description }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#121212] p-5">
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-3 text-sm leading-7 text-zinc-400">{description}</p>
    </div>
  );
}

function MetricList({ items }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[24px] border border-white/10 bg-[#121212] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-300">{item.label}</span>
            <span className="text-lg font-semibold text-white">{item.value}</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/5">
            <div className="h-2 rounded-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${Math.min(item.value * 18, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Toast({ type, message }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 rounded-[24px] border border-white/10 bg-[#111111] px-5 py-4 shadow-glow">
      <div className={`text-sm font-semibold ${type === 'success' ? 'text-emerald-300' : 'text-zinc-100'}`}>{message}</div>
    </div>
  );
}

function ActionButton({ label, onClick, disabled, tone, loading = false }) {
  const toneClass = {
    primary: 'border-red-500 bg-red-600 text-white hover:bg-red-500',
    dark: 'border-white/10 bg-white/[0.04] text-white hover:border-red-500/50 hover:bg-red-500/10',
    ghost: 'border-white/10 bg-transparent text-zinc-200 hover:border-red-500/50 hover:bg-red-500/10',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${toneClass[tone] || toneClass.dark} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {loading ? <Spinner /> : null}
      {loading ? 'Processing...' : label}
    </button>
  );
}

function SyncSheetAction({ onSyncGoogleSheet, isSyncingSheet, lastSheetSyncAt }) {
  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <ActionButton label="Sync Ticket Sheet" onClick={onSyncGoogleSheet} disabled={isSyncingSheet} tone="dark" loading={isSyncingSheet} />
      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Tab Ticket on Google Sheets</div>
      <div className="text-xs text-zinc-500">
        {lastSheetSyncAt ? `Last synced: ${formatSyncTime(lastSheetSyncAt)}` : 'Last synced: not yet'}
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />;
}

function formatSyncTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'invalid time';
  }
  return date.toLocaleString();
}

async function handleAttachmentSelection(fileList, kind, currentAttachments, onAttachmentsChange) {
  const files = Array.from(fileList || []).slice(0, 4);
  if (!files.length) {
    return;
  }

  const encodedFiles = await Promise.all(files.map((file) => readAttachment(file, kind)));
  onAttachmentsChange([...currentAttachments, ...encodedFiles].slice(0, 8));
}

function readAttachment(file, kind) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        kind,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function AttachmentInput({ label, accept, helper, onSelect }) {
  return (
    <label className="rounded-[26px] border border-dashed border-white/10 bg-[#121212] p-4 transition hover:border-red-500/40 hover:bg-[#171717]">
      <span className="block text-sm font-semibold text-zinc-200">{label}</span>
      <span className="mt-2 block text-xs leading-6 text-zinc-500">{helper}</span>
      <input
        type="file"
        accept={accept}
        multiple
        className="mt-4 block w-full text-sm text-zinc-400 file:mr-4 file:rounded-2xl file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-red-500"
        onChange={(event) => {
          const selectedFiles = Array.from(event.target.files || []);
          void onSelect(selectedFiles);
          event.target.value = '';
        }}
      />
    </label>
  );
}

function AttachmentPreview({ attachments, onRemove }) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="rounded-[26px] border border-white/10 bg-[#121212] p-4">
      <div className="text-sm font-semibold text-white">Ticket evidence</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="rounded-2xl border border-white/10 bg-[#181818] p-3">
            {attachment.kind === 'image' ? (
              <img src={attachment.dataUrl} alt={attachment.name} className="h-28 w-full rounded-2xl object-cover" />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-sm font-semibold text-zinc-400">
                FILE
              </div>
            )}
            <div className="mt-3 truncate text-sm font-medium text-zinc-200">{attachment.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{formatFileSize(attachment.size)}</div>
            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-200 transition hover:border-red-500/50 hover:bg-red-500/10"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatFileSize(size = 0) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function buildTopCounts(items) {
  const counts = new Map();
  items.filter(Boolean).forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

function buildShieldSuiteCsv(suite) {
  const rows = [
    ['case_id', 'pass', 'confidence', 'complaint_group', 'market', 'gip', 'escalation_level', 'customer_service_pic', 'department_pic', 'notification_groups', 'sla', 'sop', 'mismatch_fields', 'message', 'expected_output', 'actual_output'],
    ...(suite.results || []).map((result) => [
      result.id,
      result.pass ? 'PASS' : 'FAIL',
      Number(result.confidence || 0).toFixed(2),
      result.expected?.complaintGroup || '',
      result.expected?.market || '',
      result.expected?.gip || '',
      result.expected?.escalationLevel || '',
      result.expected?.customerServicePic || '',
      result.expected?.departmentPic || '',
      (result.expected?.notificationGroups || []).join(' | '),
      result.expected?.sla || '',
      result.expected?.sop || '',
      (result.mismatches || []).map((item) => item.field).join(' | '),
      result.message || '',
      result.expected?.recommendedOutput || '',
      result.actual?.recommendedOutput || '',
    ]),
  ];

  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function isToday(dateValue) {
  if (!dateValue) {
    return false;
  }
  const date = new Date(dateValue);
  const now = new Date();
  return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function BaseIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      {children}
    </svg>
  );
}

function PulseIcon() {
  return <BaseIcon><path d="M3 12h4l2-4 4 8 2-4h6" /></BaseIcon>;
}
function TimerIcon() {
  return <BaseIcon><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 3h6" /></BaseIcon>;
}
function SparkIcon() {
  return <BaseIcon><path d="M12 3l1.9 4.8L19 9.7l-4 2.8 1.3 5-4.3-2.7-4.3 2.7 1.3-5-4-2.8 5.1-1.9L12 3z" /></BaseIcon>;
}
function CheckIcon() {
  return <BaseIcon><path d="M5 13l4 4L19 7" /></BaseIcon>;
}
function TicketsIcon() {
  return <BaseIcon><path d="M5 7h14v4a2 2 0 010 4v2H5v-2a2 2 0 010-4z" /><path d="M9 7v10" /></BaseIcon>;
}
function SheetIcon() {
  return <BaseIcon><path d="M6 4h9l3 3v13H6z" /><path d="M15 4v4h4" /><path d="M9 12h6" /><path d="M9 16h6" /></BaseIcon>;
}