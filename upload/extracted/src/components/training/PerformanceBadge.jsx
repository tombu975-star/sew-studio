import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const LEVEL_STYLES = {
  Beginner: 'bg-stone-100 text-stone-600 border-stone-200',
  Practicing: 'bg-amber-50 text-amber-700 border-amber-200',
  Confident: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30',
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

export default function PerformanceBadge({ performance }) {
  if (!performance || performance.score === null) {
    return <span className="text-[10px] text-stone-400">No sessions yet</span>;
  }
  const TrendIcon = TREND_ICON[performance.trend];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border rounded-sm ${LEVEL_STYLES[performance.label]}`}>
      {performance.label}
      {TrendIcon && <TrendIcon className="w-3 h-3" />}
    </span>
  );
}