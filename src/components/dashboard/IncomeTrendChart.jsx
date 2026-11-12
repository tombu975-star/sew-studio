import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AtelierCard from '@/components/AtelierCard';
import { formatCurrency } from '@/lib/format';

export default function IncomeTrendChart({ payments }) {
  const data = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-GB', { month: 'short' }), total: 0 });
    }
    const byKey = Object.fromEntries(months.map(m => [m.key, m]));
    (payments || []).forEach(p => {
      if (!p.date) return;
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (byKey[key]) byKey[key].total += Number(p.amount) || 0;
    });
    return months;
  }, [payments]);

  const total = data.reduce((s, m) => s + m.total, 0);

  return (
    <AtelierCard title="Income Trend" action={<span className="text-[11px] text-stone-400">{formatCurrency(total)} last 8 months</span>}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E7E5E4" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={v => formatCurrency(v)} labelFormatter={l => l} contentStyle={{ fontSize: 12, borderRadius: 2, borderColor: '#E7E5E4' }} />
            <Line type="monotone" dataKey="total" stroke="#800020" strokeWidth={2} dot={{ r: 3, fill: '#800020' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AtelierCard>
  );
}