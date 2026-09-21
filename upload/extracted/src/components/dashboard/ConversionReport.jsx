import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import AtelierCard from '@/components/AtelierCard';
import { ORDER_STATUSES } from '@/lib/format';

const CONFIRMED_IDX = ORDER_STATUSES.indexOf('Confirmed');
const MONTHS_BACK = 8;

const monthKey = (d) => (d ? String(d).slice(0, 7) : '');

export default function ConversionReport({ orders }) {
  const rows = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = MONTHS_BACK - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-GB', { month: 'short' }),
      });
    }
    return months.map(({ key, label }) => {
      const monthOrders = orders.filter(o => monthKey(o.order_date) === key);
      const confirmed = monthOrders.filter(
        o => ORDER_STATUSES.indexOf(o.status) >= CONFIRMED_IDX
      ).length;
      return {
        label,
        enquiries: monthOrders.length,
        confirmed,
        rate: monthOrders.length ? Math.round((confirmed / monthOrders.length) * 100) : null,
      };
    });
  }, [orders]);

  const totals = useMemo(() => {
    const tracked = rows.reduce((s, r) => ({ enquiries: s.enquiries + r.enquiries, confirmed: s.confirmed + r.confirmed }), { enquiries: 0, confirmed: 0 });
    return { ...tracked, rate: tracked.enquiries ? Math.round((tracked.confirmed / tracked.enquiries) * 100) : 0 };
  }, [rows]);

  const tooltipFormatter = (value, name) => [value, name === 'enquiries' ? 'Enquiries' : 'Confirmed'];
  const tooltipLabel = (row) => `${row.enquiries} enquir${row.enquiries === 1 ? 'y' : 'ies'} · ${row.confirmed} confirmed${row.rate !== null ? ` · ${row.rate}%` : ''}`;

  return (
    <AtelierCard title="Order Conversion">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div>
          <div className="font-display text-3xl font-semibold text-[#1C1917] leading-none">{totals.enquiries}</div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 mt-1.5">Enquiries (last {MONTHS_BACK} months)</div>
        </div>
        <div>
          <div className="font-display text-3xl font-semibold text-[#800020] leading-none">{totals.confirmed}</div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 mt-1.5">Confirmed orders</div>
        </div>
        <div>
          <div className="font-display text-3xl font-semibold text-[#D97706] leading-none">{totals.rate}%</div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400 mt-1.5">Conversion rate</div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <CartesianGrid vertical={false} stroke="#E7E5E4" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(128,0,32,0.04)' }}
              formatter={tooltipFormatter}
              labelFormatter={tooltipLabel}
              contentStyle={{ borderRadius: 2, border: '1px solid #E7E5E4', fontSize: 12 }}
            />
            <Bar dataKey="enquiries" fill="#D6D3D1" radius={[2, 2, 0, 0]} />
            <Bar dataKey="confirmed" fill="#800020" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E7E5E4] text-[11px] text-stone-400">
        Enquiries counted by order date; an enquiry counts as converted once it reaches Confirmed or beyond.
      </div>
    </AtelierCard>
  );
}