import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AttentionList({ items }) {
  return (
    <div className="border border-dashed border-[#800020]/40 rounded-sm bg-white/50">
      <div className="px-5 py-4 border-b border-dashed border-[#800020]/30 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[#800020]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#800020]">Needs Your Attention</h3>
      </div>
      <div className="p-5">
        {items.length === 0 ? (
          <div className="flex items-center gap-3 py-3 px-3 border border-[#E7E5E4] rounded-sm bg-white">
            <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
            <span className="text-sm text-stone-500">All clear — nothing needs your attention right now.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((msg, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 border border-[#E7E5E4] rounded-sm bg-white">
                <div className="w-1.5 h-1.5 rounded-full bg-[#B45309] shrink-0" />
                <span className="text-sm text-stone-500">{msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}