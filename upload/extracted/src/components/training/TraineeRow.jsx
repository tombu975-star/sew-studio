import React from 'react';
import { AlertTriangle, Target } from 'lucide-react';
import { formatDate } from '@/lib/format';
import PerformanceBadge from './PerformanceBadge';

const STAGE_STYLES = {
  Foundation: 'bg-stone-100 text-stone-600 border-stone-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30',
};

export default function TraineeRow({ t, last, days, stale, performance, recommended, trainerName }) {
  return (
    <div className="py-3.5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-xs font-semibold text-[#800020] shrink-0">
        {(t.name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-[#1C1917]">{t.name}</p>
          <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border rounded-sm ${STAGE_STYLES[t.stage] || STAGE_STYLES.Foundation}`}>{t.stage || 'Foundation'}</span>
          <span className="text-[10px] text-stone-400">{t.program}</span>
        </div>
        <p className="text-[11px] text-stone-400 mt-0.5">
          Trainer: {trainerName || '—'}
          {t.start_date && <> · started {formatDate(t.start_date)}</>}
        </p>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <PerformanceBadge performance={performance} />
          {recommended && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#800020] font-medium"><Target className="w-3 h-3" /> Next: {recommended.name}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] text-stone-500">{last ? `Last session ${formatDate(last.date)}` : 'No sessions logged'}</p>
        {stale && (
          <p className="text-[10px] text-amber-700 font-medium mt-0.5 flex items-center gap-1 justify-end">
            <AlertTriangle className="w-3 h-3" />
            {last ? `no session for ${days} days` : 'no session logged yet'}
          </p>
        )}
      </div>
    </div>
  );
}