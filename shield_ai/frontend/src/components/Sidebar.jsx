import { navigationItems } from '../data/navigation';

const iconMap = {
  dashboard: DashboardIcon,
  analysis: SparkIcon,
  catalog: CatalogIcon,
  agents: AgentsIcon,
  tickets: TicketsIcon,
  sla: TimerIcon,
  analytics: AnalyticsIcon,
  settings: SettingsIcon,
};

export default function Sidebar({ activeSection, onSelectSection, collapsed, onToggleCollapsed }) {
  return (
    <aside className={`flex h-full min-h-[860px] w-full flex-col rounded-[32px] border border-white/10 bg-[#090909] shadow-panel transition-all duration-300 ${collapsed ? 'max-w-[98px] px-4 py-5' : 'max-w-[292px] px-5 py-6'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-display text-[11px] uppercase tracking-[0.42em] text-red-500/90 ${collapsed ? 'text-center' : ''}`}>Shield AI</p>
          {!collapsed ? <h1 className="mt-3 font-display text-[28px] font-extrabold leading-tight text-white">AI Operations Agent</h1> : null}
          {!collapsed ? <p className="mt-3 text-sm leading-6 text-zinc-400">Trung tâm điều hành AI phân tích incident, quản lý SLA và vận hành ticket theo thời gian thực.</p> : null}
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <ChevronIcon collapsed={collapsed} />
        </button>
      </div>

      <nav className="mt-8 space-y-2">
        {navigationItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = iconMap[item.icon] || DashboardIcon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition duration-300 ${
                isActive
                  ? 'border-red-500/70 bg-red-500/14 text-white shadow-glow'
                  : 'border-transparent bg-white/[0.03] text-zinc-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${isActive ? 'border-red-500/50 bg-red-500/18 text-red-400' : 'border-white/10 bg-black/30 text-zinc-400 group-hover:border-red-500/40 group-hover:text-red-400'}`}>
                <Icon />
              </span>
              {!collapsed ? (
                <span className="min-w-0">
                  <div className="font-semibold leading-5">{item.label}</div>
                  <div className={`mt-1 text-xs ${isActive ? 'text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-400'}`}>{item.hint}</div>
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className={`mt-auto rounded-[28px] border border-white/10 bg-gradient-to-br from-red-500/18 via-red-500/8 to-transparent p-4 ${collapsed ? 'text-center' : ''}`}>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/12 text-red-400">
            <PulseIcon />
          </span>
          {!collapsed ? (
            <div>
              <div className="font-semibold text-white">Realtime AI Core</div>
              <div className="mt-1 text-xs text-zinc-400">Ticket sync, SLA sentinel, and agent orchestration online.</div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function BaseIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      {children}
    </svg>
  );
}

function DashboardIcon() {
  return <BaseIcon><path d="M4 12h7V4H4z" /><path d="M13 20h7v-9h-7z" /><path d="M13 10h7V4h-7z" /><path d="M4 20h7v-6H4z" /></BaseIcon>;
}
function SparkIcon() {
  return <BaseIcon><path d="M12 3l1.9 4.8L19 9.7l-4 2.8 1.3 5-4.3-2.7-4.3 2.7 1.3-5-4-2.8 5.1-1.9L12 3z" /></BaseIcon>;
}
function CatalogIcon() {
  return <BaseIcon><path d="M6 4h9l3 3v13H6z" /><path d="M15 4v4h4" /><path d="M9 12h6" /><path d="M9 16h6" /></BaseIcon>;
}
function AgentsIcon() {
  return <BaseIcon><rect x="4" y="5" width="16" height="12" rx="2" /><path d="M9 21h6" /><path d="M12 17v4" /><circle cx="9" cy="11" r="1" /><circle cx="15" cy="11" r="1" /><path d="M8 14c1 .7 2.1 1 4 1s3-.3 4-1" /></BaseIcon>;
}
function TicketsIcon() {
  return <BaseIcon><path d="M5 7h14v4a2 2 0 010 4v2H5v-2a2 2 0 010-4z" /><path d="M9 7v10" /></BaseIcon>;
}
function TimerIcon() {
  return <BaseIcon><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 3h6" /></BaseIcon>;
}
function AnalyticsIcon() {
  return <BaseIcon><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" /></BaseIcon>;
}
function SettingsIcon() {
  return <BaseIcon><path d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.2a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.2a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3H9A1.7 1.7 0 0010 3.2V3a2 2 0 014 0v.2a1.7 1.7 0 001.1 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c.3.7.9 1.1 1.6 1.1h.2a2 2 0 010 4H21a1.7 1.7 0 00-1.6 1z" /></BaseIcon>;
}
function PulseIcon() {
  return <BaseIcon><path d="M3 12h4l2-4 4 8 2-4h6" /></BaseIcon>;
}
function ChevronIcon({ collapsed }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-5 w-5 transition ${collapsed ? 'rotate-180' : ''}`}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
