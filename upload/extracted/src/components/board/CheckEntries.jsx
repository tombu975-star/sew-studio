import React from 'react';
import { shortDate } from '@/lib/format';

const RESULT_STYLES = {
  'Pass': 'bg-green-50 text-[#15803D] border-green-200',
  'Needs Rework': 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function CheckEntries({ checks }) {
  if (!checks.length) {
    return <p className="text-xs text-stone-300 py-4 text-center">No check-ins yet.</p>;
  }
  const sorted = [...checks].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto pr-0.5">
      {sorted.map(c => (
        <div key={c.id} className="flex items-start gap-2 bg-[#FBF9F7] border border-[#EDEBE9] rounded-sm p-2.5">
          <span className={`text-[10px] px-1.5 py-0.5 border rounded-sm font-medium whitespace-nowrap ${RESULT_STYLES[c.result]}`}>{c.result}</span>
          <div className="min-w-0">
            <p className="text-xs text-[#1C1917] leading-snug">{c.stage}{c.notes ? ` — ${c.notes}` : ''}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">{c.inspectorName || 'Studio'} · {shortDate(c.date)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}