export default function StatCard({ label, value, accent, detail, icon }) {
  return (
    <div className="group rounded-[28px] border border-white/10 bg-gradient-to-br from-[#181818] to-[#111111] p-5 shadow-panel transition duration-300 hover:-translate-y-1 hover:border-red-500/60 hover:shadow-glow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">{label}</span>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 ${accent}`}>{icon}</span>
      </div>
      <div className="mt-5 font-display text-4xl font-bold text-white">{value}</div>
      <div className="mt-3 text-sm leading-6 text-zinc-500">{detail}</div>
    </div>
  );
}
