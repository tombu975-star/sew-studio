import React from 'react';
import { Star } from 'lucide-react';
import { formatDate } from '@/lib/format';

export default function StyleHistoryPanel({ concepts }) {
  const approved = concepts.filter(c => c.status === 'Approved' || c.status === 'Converted');
  if (approved.length === 0) return null;
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm mt-5">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center gap-2">
        <Star className="w-3.5 h-3.5 text-[#B45309]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Style History — Approved Concepts</h3>
      </div>
      <div className="p-5 space-y-3">
        {approved.map(c => (
          <div key={c.id} className="border border-[#E7E5E4] rounded-sm p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-[#1C1917]">{c.concept_name}</span>
              <span className="text-xs text-stone-400">{formatDate(c.created_date)}</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">{[c.garment_type, c.silhouette, c.fabric, c.colour].filter(Boolean).join(' · ')}</p>
            {c.fitting_feedback && <p className="text-xs text-stone-500 mt-1 italic">Fitting: {c.fitting_feedback}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}