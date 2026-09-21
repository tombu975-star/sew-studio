import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';

const GROUPS = [
  { key: 'Self-Entered', label: 'Self-Entered', color: '#1C1917' },
  { key: 'Apprentice-Logged', label: 'Apprentice-Logged', color: '#B45309' },
  { key: 'Assisted', label: 'Assisted (Call / WhatsApp)', color: '#800020' },
];

// What percentage of this month's entries were self-entered vs apprentice-logged vs assisted.
export default function EntrySourceBreakdown() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500).catch(() => []),
      base44.entities.OrderMaterial.list('-created_date', 500).catch(() => []),
      base44.entities.OrderLabour.list('-created_date', 500).catch(() => []),
      base44.entities.Payment.list('-created_date', 500).catch(() => []),
      base44.entities.AccraRunItem.list('-created_date', 500).catch(() => []),
      base44.entities.OtherIncome.list('-created_date', 500).catch(() => []),
    ]).then(collections => setRows(collections.flat()));
  }, []);

  if (rows === null) return null;

  const now = new Date();
  const thisMonth = rows.filter(r => {
    const d = new Date(r.created_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const total = thisMonth.length;
  const groups = GROUPS.map(g => ({
    ...g,
    count: thisMonth.filter(r => {
      const e = r.entry_log || 'Self-Entered';
      return g.key === 'Assisted' ? (e === 'Assisted Call' || e === 'Assisted WhatsApp') : e === g.key;
    }).length,
  }));

  return (
    <AtelierCard title="How Data Got In — This Month">
      {total === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">No entries recorded this month yet.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <div key={g.key}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-stone-500">{g.label}</span>
                <span className="text-stone-500">{g.count} {g.count === 1 ? 'entry' : 'entries'} · {total > 0 ? Math.round((g.count / total) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${total > 0 ? (g.count / total) * 100 : 0}%`, backgroundColor: g.color }} />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-stone-400 pt-1">Across orders, materials, labour, payments, Accra Run items and other income.</p>
        </div>
      )}
    </AtelierCard>
  );
}