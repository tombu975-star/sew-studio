import React from 'react';
import { cn } from '@/lib/utils';

export default function MetricCard({ label, value, sub, accent, className }) {
  return (
    <div className={cn('bg-white border border-[#E7E5E4] rounded-sm p-5 flex flex-col justify-between', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <div className="mt-3">
        <div className={cn('font-display font-semibold leading-none', accent ? 'text-[#800020]' : 'text-[#1C1917]')} style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>
          {value}
        </div>
        {sub && <p className="mt-2 text-xs text-stone-400">{sub}</p>}
      </div>
    </div>
  );
}