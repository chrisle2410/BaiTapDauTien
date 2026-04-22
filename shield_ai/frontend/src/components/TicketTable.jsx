import { useEffect, useState } from 'react';

const statusTone = {
  OPEN: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  'IN PROGRESS': 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
};

const priorityTone = {
  Critical: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
  High: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30',
  Medium: 'bg-zinc-500/15 text-zinc-200 ring-1 ring-zinc-500/30',
  Low: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
};

const statusOptions = ['OPEN', 'IN PROGRESS', 'RESOLVED'];

export default function TicketTable({ tickets, onStatusChange, updatingTicketId = '', rowsPerPage = 6 }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tickets.length]);

  if (!tickets.length) {
    return <div className="rounded-[28px] border border-dashed border-white/10 bg-[#111111] p-8 text-sm text-zinc-500">Chưa có ticket nào được tạo. Hãy phân tích một case và bấm Create Ticket.</div>;
  }

  const totalPages = Math.max(1, Math.ceil(tickets.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const visibleTickets = tickets.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#111111]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-[#171717] text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Ticket ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Cấp SHIELD</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">PIC DVKH</th>
              <th className="px-4 py-3">Assigned PIC</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">SLA Timer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#111111]">
            {visibleTickets.map((ticket) => (
              <tr key={ticket.ticketId} className="align-top transition duration-200 hover:bg-white/[0.04]">
                <td className="px-4 py-4 font-semibold text-white">{ticket.ticketId}</td>
                <td className="px-4 py-4">
                  <div className="max-w-[240px] text-sm leading-6 text-zinc-300">{ticket.customerMessage}</div>
                </td>
                <td className="px-4 py-4">
                  <EvidenceCell attachments={ticket.attachments} />
                </td>
                <td className="px-4 py-4 text-zinc-300">{ticket.service}</td>
                <td className="px-4 py-4">
                  <div className="min-w-[112px]">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${escalationTone(ticket.escalationLevel)}`}>
                      {ticket.escalationLabel || (ticket.escalationLevel ? `Cấp ${ticket.escalationLevel}` : 'N/A')}
                    </span>
                    {ticket.testCaseId ? <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">{ticket.testCaseId}</div> : null}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityTone[ticket.priority] || 'bg-zinc-700 text-zinc-200 ring-1 ring-white/10'}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-4 py-4 text-zinc-300">{ticket.customerServicePic || 'N/A'}</td>
                <td className="px-4 py-4 text-zinc-300">{ticket.pic}</td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    {onStatusChange ? (
                      <select
                        value={ticket.status}
                        disabled={updatingTicketId === ticket.ticketId}
                        onChange={(event) => onStatusChange(ticket.ticketId, event.target.value)}
                        className="block w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2 text-xs text-zinc-200 outline-none transition focus:border-red-500"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone[ticket.status] || 'bg-zinc-700 text-zinc-200 ring-1 ring-white/10'}`}>
                        {ticket.status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-zinc-200">{formatDeadline(ticket.slaDeadline, ticket.sla)}</div>
                  <div className="mt-1 text-xs text-zinc-500">{formatRemaining(ticket.slaDeadline, ticket.status)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#141414] px-4 py-4 text-sm text-zinc-400">
        <div>Trang <span className="font-semibold text-white">{safePage}</span> / <span className="font-semibold text-white">{totalPages}</span></div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={safePage === totalPages}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function escalationTone(level) {
  if (Number(level) >= 3) {
    return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
  }
  if (Number(level) === 2) {
    return 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30';
  }
  if (Number(level) === 1) {
    return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30';
  }
  return 'bg-zinc-700 text-zinc-200 ring-1 ring-white/10';
}

function EvidenceCell({ attachments = [] }) {
  if (!attachments.length) {
    return <div className="text-xs text-zinc-500">No evidence</div>;
  }

  const previewItems = attachments.slice(0, 2);
  const remaining = attachments.length - previewItems.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {previewItems.map((attachment) => (
        attachment.kind === 'image' ? (
          <a
            key={attachment.id}
            href={attachment.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <img src={attachment.dataUrl} alt={attachment.name} className="h-12 w-12 rounded-xl border border-white/10 object-cover" />
          </a>
        ) : (
          <a
            key={attachment.id}
            href={attachment.dataUrl}
            download={attachment.name}
            className="inline-flex h-12 min-w-[56px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300"
          >
            File
          </a>
        )
      ))}
      {remaining > 0 ? <span className="text-xs text-zinc-500">+{remaining}</span> : null}
    </div>
  );
}

function formatDeadline(slaDeadline, fallback) {
  if (!slaDeadline) {
    return fallback || 'No SLA';
  }
  return new Date(slaDeadline).toLocaleString();
}

function formatRemaining(slaDeadline, status) {
  if (!slaDeadline) {
    return 'No deadline';
  }
  if (status === 'RESOLVED') {
    return 'Completed';
  }

  const delta = new Date(slaDeadline).getTime() - Date.now();
  if (delta <= 0) {
    return 'Overdue';
  }

  const totalMinutes = Math.floor(delta / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m remaining`;
}
