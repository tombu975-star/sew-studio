import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AtelierCard from '@/components/AtelierCard';
import { formatCurrency } from '@/lib/format';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ExpenseTracker({ materials = [], labour = [] }) {
  const { months, thisMonth, materialTotal, labourTotal } = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const buckets = {};

    const addToBucket = (item, kind) => {
      if (!item) return;
      const key = (item.created_date || '').slice(0, 7);
      if (!key) return;
      if (!buckets[key]) buckets[key] = { key, materials: 0, labour: 0 };
      buckets[key][kind] += Number(item.total_cost ?? item.cost ?? 0) || 0;
    };
    materials.forEach(m => addToBucket(m, 'materials'));
    labour.forEach(l => addToBucket(l, 'labour'));

    const months = Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6)
      .map(b => {
        const [y, m] = b.key.split('-');
        return { ...b, label: `${MONTH_NAMES[Number(m) - 1]} ${y.slice(2)}`, total: b.materials + b.labour };
      });

    const cur = buckets[currentKey] || { materials: 0, labour: 0 };
    return {
      months,
      thisMonth: cur,
      materialTotal: cur.materials,
      labourTotal: cur.labour,
    };
  }, [materials, labour]);

  const total = materialTotal + labourTotal;

  return (
    <AtelierCard title="Monthly Expenses">
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="border border-[#E7E5E4] rounded-sm px-4 py-3">
          <div className="font-display text-xl md:text-2xl font-semibold text-[#1C1917] leading-none">{formatCurrency(materialTotal)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-wider">Materials</div>
        </div>
        <div className="border border-[#E7E5E4] rounded-sm px-4 py-3">
          <div className="font-display text-xl md:text-2xl font-semibold text-[#1C1917] leading-none">{formatCurrency(labourTotal)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-wider">Labour</div>
        </div>
        <div className="border border-[#800020]/30 bg-[#800020]/5 rounded-sm px-4 py-3">
          <div className="font-display text-xl md:text-2xl font-semibold text-[#800020] leading-none">{formatCurrency(total)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-wider">This Month</div>
        </div>
      </div>

      {months.length === 0 ? (
        <p className="text-sm text-stone-400 py-6 text-center">No production costs logged yet.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A8A29E' }} axisLine={{ stroke: '#E7E5E4' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A8A29E' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                formatter={(v) => formatCurrency(v)}
                contentStyle={{ borderRadius: 2, border: '1px solid #E7E5E4', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              <Bar dataKey="materials" name="Materials" stackId="exp" fill="#800020" />
              <Bar dataKey="labour" name="Labour" stackId="exp" fill="#B45309" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[11px] text-stone-400 mt-3">Costs are grouped by the month they were logged. Top bar shows the current month's totals.</p>
    </AtelierCard>
  );
}