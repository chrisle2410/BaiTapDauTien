export default function TopBar({ activeModule, searchValue, onSearchChange, notificationCount, onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-20 rounded-[30px] border border-white/10 bg-[#111111]/90 px-5 py-4 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white xl:hidden"
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
          <div>
            <div className="text-[11px] uppercase tracking-[0.38em] text-zinc-500">Command Center</div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">AI Operations Agent</h2>
            <div className="mt-1 text-sm text-zinc-500">{activeModule}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-w-[280px] items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-zinc-400 transition focus-within:border-red-500/60 focus-within:bg-[#1f1f1f]">
            <SearchIcon />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search tickets, services, agents..."
              className="w-full bg-transparent text-zinc-100 outline-none"
            />
          </label>

          <button type="button" className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#1a1a1a] text-zinc-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-white">
            <BellIcon />
            <span className="absolute right-2 top-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{notificationCount}</span>
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a] px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-sm font-bold text-white">AO</div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-white">Operations Lead</div>
              <div className="text-xs text-zinc-500">System Admin</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function BaseIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      {children}
    </svg>
  );
}

function SearchIcon() {
  return <BaseIcon><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></BaseIcon>;
}
function BellIcon() {
  return <BaseIcon><path d="M15 17H5l1.2-1.2A2 2 0 007 14.4V11a5 5 0 1110 0v3.4a2 2 0 00.8 1.6L19 17h-4" /><path d="M10 21a2 2 0 004 0" /></BaseIcon>;
}
function MenuIcon() {
  return <BaseIcon><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></BaseIcon>;
}