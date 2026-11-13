import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

const SeasonTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-[#1C1917]">{label}</p>
      <p className="text-[11px] text-[#800020] mt-1">Projected: {d.revenue > 0 ? formatCurrency(d.revenue) : '—'}</p>
      {d.target != null && <p className="text-[11px] text-amber-700">Target: {formatCurrency(d.target)}</p>}
      {d.events.length > 0 && <p className="text-[11px] text-stone-500 mt-1 border-t border-[#F3F1EF] pt-1">{d.events.join(' · ')}</p>}
    </div>
  );
};

export default function SeasonOutlook({ months }) {
  const data = months.map(m => ({
    name: m.name,
    revenue: m.revenue,
    target: m.plan?.target_revenue ?? null,
    events: m.events,
    busy: m.busy,
  }));

  return (
    <div className="border border-[#E7E5E4] rounded-sm bg-[#FBF9F7]/60 p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Season Outlook — projected revenue vs events</h4>
      </div>
      <div className="h-40 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EFEBE7" />
            <XAxis dataKey="name" interval={0} tick={{ fontSize: 9, fill: '#A8A29E' }} axisLine={{ stroke: '#E7E5E4' }} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#A8A29E' }} axisLine={false} tickLine={false} width={34}
              tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
            <Tooltip content={<SeasonTooltip />} cursor={{ fill: 'rgba(128,0,32,0.04)' }} />
            <Bar dataKey="revenue" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.busy ? '#B45309' : '#800020'} fillOpacity={d.busy ? 0.9 : 0.7} />)}
            </Bar>
            <Line dataKey="target" stroke="#D97706" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-6 md:grid-cols-12 gap-1 mt-2">
        {months.map(m => (
          <div key={m.key} className="min-w-0">
            <div className="text-[8px] uppercase tracking-widest text-stone-300">{m.name}</div>
            {m.events.length > 0 ? (
              <div className="mt-1 space-y-0.5">
                {m.events.slice(0, 2).map((ev, i) => (
                  <div key={i} title={ev} className="truncate text-[9px] leading-tight px-1 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">{ev}</div>
                ))}
                {m.events.length > 2 && <div className="text-[8px] text-amber-700">+{m.events.length - 2} more</div>}
              </div>
            ) : (
              <div className="text-[9px] text-stone-300 mt-1">—</div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-stone-400 mt-3">
        <span className="inline-block w-2 h-2 bg-[#B45309] align-middle mr-1 rounded-[1px]" />
        Busy months — revenue peaking or multiple events. Amber dashed line is your revenue target.
      </p>
    </div>
  );
}