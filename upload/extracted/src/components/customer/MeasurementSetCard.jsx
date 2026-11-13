import React from 'react';
import { Copy, GitCompare } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';

const FIELDS = [
  ['full_bust', 'Bust'], ['natural_waist', 'Waist'], ['full_hip', 'Hip'],
  ['shoulder_width', 'Shoulder'], ['sleeve_length', 'Sleeve'], ['height', 'Height'],
];

export default function MeasurementSetCard({ set, uMap, latest, onDuplicate, onCompare }) {
  return (
    <div className="border border-[#E7E5E4] rounded-sm p-4 bg-white">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1C1917]">{set.set_name}</span>
            {latest && <span className="text-[10px] uppercase tracking-wide text-[#B45309] font-semibold">Latest</span>}
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{formatDate(set.date_taken)} · {set.unit} · {set.garment_type}{set.taken_by && uMap[set.taken_by] ? ` · by ${uMap[set.taken_by].full_name || uMap[set.taken_by].email}` : ''}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${set.status === 'Confirmed' ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-stone-100 text-stone-500'}`}>{set.status}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${set.customer_approval === 'Approved' ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#B45309]/10 text-[#B45309]'}`}>{set.customer_approval}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
        {FIELDS.map(([k, label]) => (
          <div key={k}><div className="text-[10px] uppercase tracking-wide text-stone-400">{label}</div><div className="text-sm font-medium text-[#1C1917]">{set[k] ?? '—'}</div></div>
        ))}
      </div>
      {set.general_notes && <p className="text-xs text-stone-500 mt-3 pt-3 border-t border-[#E7E5E4]">{set.general_notes}</p>}
      <div className="flex items-center gap-3 mt-3">
        <button onClick={() => onDuplicate(set)} className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020]"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
        {onCompare && <button onClick={() => onCompare(set)} className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#800020]"><GitCompare className="w-3.5 h-3.5" /> Compare</button>}
      </div>
    </div>
  );
}