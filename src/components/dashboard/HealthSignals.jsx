import React from 'react';
import { signalColor } from '@/lib/healthColors';

export default function HealthSignals({ signals }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Signal Breakdown</span>
      <div className="space-y-3 mt-3">
        {signals.map(s => (
          <div key={s.key}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-[#1C1917]">{s.label}</span>
              <span className="text-[10px] text-stone-400 truncate">{s.detail}</span>
            </div>
            <div className="h-2 bg-[#F3F1EF] rounded-full">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${(s.value == null ? 0 : s.value / 20) * 100}%`, background: signalColor(s.value) }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-stone-400 mt-3">Green ≥ 14 pts · amber ≥ 8 · red below — a red bar is what pulled the score down.</p>
    </div>
  );
}