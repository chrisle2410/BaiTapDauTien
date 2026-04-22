export default function AnalysisSummary({ analysis, makeResult, ticketResult }) {
  if (!analysis) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/10 bg-[#121212] p-8 text-sm leading-7 text-zinc-500">
        Nhập nội dung khách hàng ở khung bên trái rồi bấm Analyze Ticket. Kết quả service, priority, PIC, SOP, SLA và trường SHIELD sẽ hiện ở đây.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.5fr,1fr,1fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#121212] p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Customer Message</div>
          <div className="mt-4 text-sm leading-7 text-zinc-200">{analysis.customerMessage}</div>
        </div>
        <InfoTile label="Service" value={analysis.service} />
        <InfoTile label="Priority" value={analysis.priority} />
        <InfoTile label="PIC" value={analysis.pic} />
        <InfoTile label="SOP / SLA" value={`${analysis.sop} • ${analysis.sla}`} />
      </div>

      {analysis.testCaseId ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <InfoTile label="SHIELD Case" value={`${analysis.testCaseId} • ${analysis.complaintGroup || 'Unknown'}`} />
          <InfoTile label="Escalation" value={`${analysis.escalationLabel || 'N/A'} • ${analysis.market || 'Unknown market'}`} />
          <InfoTile label="GIP / PIC DVKH" value={`${analysis.gip || 'N/A'} • ${analysis.customerServicePic || 'N/A'}`} />
          <InfoTile label="PIC Phòng Ban" value={analysis.departmentPic || 'N/A'} />
          <InfoTile label="Notify" value={(analysis.notificationGroups || []).join(', ') || 'N/A'} />
          <InfoTile label="SHIELD Confidence" value={`${Math.round((analysis.shieldConfidence || 0) * 100)}%`} />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-[#121212] p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">AI Rationale</div>
          <p className="mt-4 text-sm leading-7 text-zinc-300">{analysis.rationale}</p>
          <p className="mt-4 text-xs text-zinc-500">Confidence: {Math.round((analysis.confidence || 0) * 100)}%</p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#121212] p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Execution Status</div>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <div>Ticket: {ticketResult?.ticket?.ticketId || 'Not created yet'}</div>
            <div>Webhook Make: {makeResult ? (makeResult.delivered ? 'Delivered' : 'Prepared in mock mode') : 'Paused for now'}</div>
            <div>Telegram operator: {analysis.telegramUser || 'dashboard-user'}</div>
          </div>
        </div>
      </div>

      {analysis.recommendedOutput ? (
        <div className="rounded-[28px] border border-white/10 bg-[#121212] p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">SHIELD Recommended Output</div>
          <p className="mt-4 text-sm leading-7 text-zinc-300">{analysis.recommendedOutput}</p>
        </div>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#121212] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className="mt-4 text-sm font-semibold leading-7 text-white">{value}</div>
    </div>
  );
}
