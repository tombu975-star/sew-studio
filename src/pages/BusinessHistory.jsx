import React, { useEffect, useState } from 'react';
import { History, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';

const delta = (curr, prev) => (prev ? `${curr >= prev ? '+' : ''}${Math.round(((curr - prev) / prev) * 100)}%` : null);
const deltaClass = (curr, prev) => (prev == null ? 'text-stone-400' : curr >= prev ? 'text-[#15803D]' : 'text-[#800020]');

export default function BusinessHistory() {
  const [years, setYears] = useState(null);

  useEffect(() => {
    base44.entities.ClosedYear.list('-year', 50)
      .then(list => setYears(list.slice().sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))))
      .catch(console.error);
  }, []);

  if (!years) return <div className="p-10 text-sm text-stone-400">Loading history…</div>;

  const th = 'text-left text-[10px] uppercase tracking-[0.15em] text-stone-400 font-medium py-2.5 pr-4 whitespace-nowrap';
  const td = 'py-3.5 pr-4 text-sm whitespace-nowrap';

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto">
      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><History className="w-3.5 h-3.5" />Year-over-year</p>
      <h1 className="font-display font-semibold text-[#1C1917] mb-1" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>Business History</h1>
      <p className="text-sm text-stone-500 mb-8">Closed years, locked as final — for looking back, not planning forward.</p>

      {years.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E7E5E4] rounded-sm p-10 text-center">
          <Lock className="w-6 h-6 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">No years closed yet.</p>
          <p className="text-xs text-stone-400 mt-1.5 max-w-md mx-auto">Once a year is fully past, close it out from the Yearly Planner on the Dashboard — its final numbers will appear here for comparison.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E7E5E4] rounded-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E7E5E4]">
                <th className={th}>Year</th>
                <th className={th}>Revenue</th>
                <th className={th}>True Cost</th>
                <th className={th}>Margin</th>
                <th className={th}>Owner Pay Drawn</th>
                <th className={th}>Custom</th>
                <th className={th}>RTW</th>
                <th className={th}>Alterations</th>
                <th className={th}>Training</th>
              </tr>
            </thead>
            <tbody>
              {years.map((c, i) => {
                const prev = years[i + 1];
                const renderDelta = (curr, prevVal) => {
                  const d = delta(curr, prevVal);
                  return d && <div className={`text-[10px] mt-0.5 ${deltaClass(curr, prevVal)}`}>{d} vs {prev.year}</div>;
                };
                return (
                  <tr key={c.id} className="border-b border-[#E7E5E4] last:border-0 hover:bg-[#FBF9F7]/60">
                    <td className={td}>
                      <div className="font-display text-lg font-semibold text-[#1C1917]">{c.year}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1"><Lock className="w-2.5 h-2.5" />closed {c.closed_date || '—'}</div>
                    </td>
                    <td className={td}>
                      <div className="font-medium text-[#1C1917]">{formatCurrency(c.revenue)}</div>
                      {prev && renderDelta(c.revenue, prev.revenue)}
                    </td>
                    <td className={td}>{formatCurrency(c.true_cost)}</td>
                    <td className={td}>
                      <div className="font-medium" style={{ color: c.margin >= 0 ? '#15803D' : '#800020' }}>{formatCurrency(c.margin)}</div>
                      {prev && renderDelta(c.margin, prev.margin)}
                    </td>
                    <td className={td}>
                      {formatCurrency(c.owner_pay)}
                      {prev && renderDelta(c.owner_pay, prev.owner_pay)}
                    </td>
                    <td className={td}>{formatCurrency(c.custom_orders)}</td>
                    <td className={td}>{formatCurrency(c.rtw)}</td>
                    <td className={td}>{formatCurrency(c.alterations)}</td>
                    <td className={td}>{formatCurrency(c.training)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}