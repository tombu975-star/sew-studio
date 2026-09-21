import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { scoreColor } from '@/lib/healthColors';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HealthTrend({ snapshots }) {
  const points = (snapshots || []).map(s => ({
    ...s,
    label: MONTH_LABELS[Number(s.month.split('-')[1]) - 1] || s.month,
  }));
  const latest = points[points.length - 1];

  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Score Trend</span>
      {points.length < 2 ? (
        <p className="text-xs text-stone-400 py-8 text-center">The trend appears once a few months of scores are recorded.</p>
      ) : (
        <div className="h-36 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#A8A29E' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                formatter={v => [`${v} / 100`, 'Health score']}
                contentStyle={{ borderRadius: 2, border: '1px solid #E7E5E4', fontSize: 12 }}
              />
              <ReferenceLine y={70} stroke="#D6D3D1" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="score" stroke={scoreColor(latest.score)} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: scoreColor(latest.score) }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[10px] text-stone-400 mt-2">the last 6 months — dashed line marks the On Track threshold (70)</p>
    </div>
  );
}