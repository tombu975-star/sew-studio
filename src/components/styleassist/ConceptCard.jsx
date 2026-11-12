import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, RotateCcw, ShoppingBag } from 'lucide-react';

function Field({ label, value }) {
  if (!value) return null;
  return <div className="mb-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</span><p className="text-sm text-[#1C1917]">{value}</p></div>;
}

const REJECT_REASONS = ['Customer dislikes style', 'Colour not suitable', 'Fabric unavailable', 'Too fitted', 'Too loose', 'Too revealing', 'Too traditional', 'Too modern', 'Budget', 'Other'];

export default function ConceptCard({ concept, onApprove, onReject, onRegenerate, onConvert }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const isSaved = !!concept.id;
  const status = concept.status || 'Suggested';

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-display text-xl font-semibold text-[#1C1917]">{concept.concept_name}</h4>
        {concept.match_percent != null && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#800020]/10 text-[#800020] whitespace-nowrap">{concept.match_percent}% Match</span>
        )}
      </div>
      {status !== 'Suggested' && (
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase mb-3 ${status === 'Approved' ? 'bg-[#15803D]/10 text-[#15803D]' : status === 'Converted' ? 'bg-[#800020]/10 text-[#800020]' : 'bg-stone-100 text-stone-500'}`}>{status}</span>
      )}

      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Silhouette" value={concept.silhouette} />
        <Field label="Neckline" value={concept.neckline} />
        <Field label="Sleeve" value={concept.sleeve_style} />
        <Field label="Length" value={concept.length} />
        <Field label="Waist / Fit" value={concept.waist_fit} />
        <Field label="Fabric" value={concept.fabric} />
        <Field label="Colour" value={concept.colour} />
        <Field label="Embellishment" value={concept.embellishment} />
      </div>
      <Field label="Detailing" value={concept.detailing} />
      <Field label="Design Direction" value={concept.design_direction} />
      <Field label="Why This May Work" value={concept.why_this_may_work} />
      <Field label="Fit Considerations" value={concept.fit_considerations} />
      <Field label="Potential Alterations" value={concept.potential_alterations} />
      <Field label="Match Breakdown" value={concept.match_breakdown} />

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {REJECT_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} className={`text-[11px] px-2.5 py-1 rounded-full border ${reason === r ? 'bg-[#800020] text-white border-[#800020]' : 'border-[#E7E5E4] text-stone-500'}`}>{r}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-sm" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button size="sm" className="rounded-sm bg-stone-800 hover:bg-stone-700 text-white" onClick={() => { onReject(reason); setRejecting(false); }} disabled={!reason}>Confirm Dismiss</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E7E5E4]">
          {status === 'Suggested' && (
            <>
              <Button size="sm" className="rounded-sm bg-[#15803D] hover:bg-[#15803D]/90 text-white gap-1.5" onClick={onApprove}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
              <Button size="sm" variant="outline" className="rounded-sm gap-1.5" onClick={onRegenerate}><RotateCcw className="w-3.5 h-3.5" /> Regenerate</Button>
              <Button size="sm" variant="outline" className="rounded-sm gap-1.5 text-stone-500" onClick={() => setRejecting(true)}><XCircle className="w-3.5 h-3.5" /> Dismiss</Button>
            </>
          )}
          {status === 'Approved' && isSaved && (
            <Button size="sm" className="rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white gap-1.5" onClick={onConvert}><ShoppingBag className="w-3.5 h-3.5" /> Convert to Order</Button>
          )}
        </div>
      )}
    </div>
  );
}