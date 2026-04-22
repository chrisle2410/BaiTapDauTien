export default function SectionCard({ title, eyebrow, action, children }) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-gradient-to-br from-[#171717] to-[#111111] p-6 shadow-panel animate-floatIn">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{eyebrow}</p> : null}
          <h2 className="mt-2 font-display text-2xl font-bold text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}
