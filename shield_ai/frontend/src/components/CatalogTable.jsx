export default function CatalogTable({ catalog }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111111]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-[#171717] text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">PIC</th>
              <th className="px-4 py-3">SOP</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">Priority Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#111111]">
            {catalog.length ? (
              catalog.map((entry) => (
                <tr key={`${entry.service}-${entry.category}`} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-4 font-semibold text-white">{entry.service}</td>
                  <td className="px-4 py-4 text-zinc-300">{entry.category}</td>
                  <td className="px-4 py-4 text-zinc-300">{entry.pic}</td>
                  <td className="px-4 py-4 text-zinc-300">{entry.sop}</td>
                  <td className="px-4 py-4 text-zinc-300">{entry.sla}</td>
                  <td className="px-4 py-4 text-zinc-400">{entry.priorityRules}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                  Không có dịch vụ nào khớp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
