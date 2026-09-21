import React from 'react';
import { Flag, Banknote, Ruler, ClipboardCheck } from 'lucide-react';
import { formatDate } from '@/lib/format';

const KINDS = {
  status: { icon: Flag, classes: 'text-[#800020] bg-[#800020]/10' },
  payment: { icon: Banknote, classes: 'text-[#15803D] bg-[#15803D]/10' },
  fitting: { icon: Ruler, classes: 'text-[#B45309] bg-[#B45309]/10' },
  quality: { icon: ClipboardCheck, classes: 'text-[#1C1917] bg-[#1C1917]/10' },
};

export default function OrderJourney({ events }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Order Journey</h3>
      </div>
      <div className="p-5">
        {events.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing logged on this order yet.</p>
        ) : (
          <ol>
            {events.map((e, i) => {
              const k = KINDS[e.kind] || KINDS.status;
              const Icon = k.icon;
              return (
                <li key={e.key} className="flex gap-4 pb-6 last:pb-0">
                  <div className="relative flex flex-col items-center">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${k.classes}`}><Icon className="w-4 h-4" /></span>
                    {i < events.length - 1 && <span className="w-px flex-1 bg-[#E7E5E4] mt-1" />}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-medium text-[#1C1917]">{e.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{formatDate(e.date)}{e.who ? ` · ${e.who}` : ''}</p>
                    {e.notes && <p className="text-xs text-stone-500 mt-1.5">{e.notes}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}