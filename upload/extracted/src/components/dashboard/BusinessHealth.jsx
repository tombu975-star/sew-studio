import React, { useEffect, useMemo, useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';
import { healthSignalScores } from '@/lib/costing';
import { scoreColor, STATUS_COLORS } from '@/lib/healthColors';
import HealthGauge from '@/components/dashboard/HealthGauge';
import HealthSignals from '@/components/dashboard/HealthSignals';
import HealthTrend from '@/components/dashboard/HealthTrend';

export default function BusinessHealth({ health, settings }) {
  const { signals, score } = useMemo(() => healthSignalScores(health, settings), [health, settings]);
  const statusColor = STATUS_COLORS[health.status] || '#A8A29E';
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    base44.entities.HealthSnapshot.list()
      .then(list => setSnapshots(list.slice().sort((a, b) => a.month.localeCompare(b.month)).slice(-6)))
      .catch(console.error);
  }, []);

  // Record this month's score so the trend builds up over time
  useEffect(() => {
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    base44.entities.HealthSnapshot.list().then(list => {
      const existing = list.find(s => s.month === month);
      const payload = { score, status: health.status };
      const op = existing
        ? (existing.score === score && existing.status === health.status
          ? Promise.resolve(existing)
          : base44.entities.HealthSnapshot.update(existing.id, payload))
        : base44.entities.HealthSnapshot.create({ month, ...payload });
      return op.then(rec => {
        setSnapshots(prev => [...prev.filter(s => s.month !== month), rec].sort((a, b) => a.month.localeCompare(b.month)).slice(-6));
      });
    }).catch(console.error);
  }, [score, health.status]);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm" style={{ borderTop: `3px solid ${statusColor}` }}>
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center gap-2">
        <HeartPulse className="w-4 h-4" style={{ color: statusColor }} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Business Health</h3>
        <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `${statusColor}1A`, color: statusColor }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          {health.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 border-b border-[#E7E5E4]">
        <div className="p-5 flex flex-col items-center justify-center">
          <HealthGauge score={score} color={scoreColor(score)} />
          <p className="text-[11px] text-stone-400 text-center mt-1 max-w-[220px]">five signals — Money, Work and People — each worth up to 20 points</p>
        </div>
        <div className="p-5 border-t lg:border-t-0 lg:border-l border-[#E7E5E4]">
          <HealthSignals signals={signals} />
        </div>
        <div className="p-5 border-t lg:border-t-0 lg:border-l border-[#E7E5E4]">
          <HealthTrend snapshots={snapshots} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        <div className="p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Avg. Margin</span>
          <div className={`font-display font-semibold mt-1.5 ${health.avgMargin >= 0 ? 'text-[#15803D]' : 'text-[#800020]'}`} style={{ fontSize: 'clamp(22px, 3vw, 28px)' }}>
            {formatCurrency(health.avgMargin)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">across orders in production or later</p>
        </div>
        <div className="p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Total Outstanding</span>
          <div className="font-display font-semibold text-[#1C1917] mt-1.5" style={{ fontSize: 'clamp(22px, 3vw, 28px)' }}>
            {formatCurrency(health.outstanding)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">unpaid balance across all orders</p>
        </div>
        <div className="p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Latest Accra Run</span>
          <div className="font-display font-semibold mt-1.5" style={{ fontSize: 'clamp(22px, 3vw, 28px)', color: health.fulfilment !== null && health.fulfilment < 0.7 ? '#800020' : '#1C1917' }}>
            {health.fulfilment === null ? '—' : `${Math.round(health.fulfilment * 100)}%`}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">fulfilment on most recent logged trip</p>
        </div>
        <div className="p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Quality Pass Rate</span>
          <div className="font-display font-semibold mt-1.5" style={{ fontSize: 'clamp(22px, 3vw, 28px)', color: health.qualityPassRate !== null && health.qualityPassRate < 0.8 ? '#800020' : '#1C1917' }}>
            {health.qualityPassRate === null ? '—' : `${Math.round(health.qualityPassRate * 100)}%`}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">quality checks passed, last 30 days</p>
        </div>
        <div className="p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Overdue Tasks</span>
          <div className="font-display font-semibold mt-1.5" style={{ fontSize: 'clamp(22px, 3vw, 28px)', color: health.overdueTasks !== null && health.overdueTasks > 0.2 ? '#800020' : '#1C1917' }}>
            {health.overdueTasks === null ? '—' : `${Math.round(health.overdueTasks * 100)}%`}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">open tasks past their due date</p>
        </div>
      </div>
    </div>
  );
}