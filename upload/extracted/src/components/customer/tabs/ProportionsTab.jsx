import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { computeProportionRatios, detectAsymmetry } from '@/lib/proportions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function RatioRow({ label, value, suffix }) {
  return <div className="flex justify-between text-sm py-1.5 border-b border-[#E7E5E4] last:border-0"><span className="text-stone-500">{label}</span><span className="font-medium text-[#1C1917]">{value != null ? `${value.toFixed(2)}${suffix || ''}` : '—'}</span></div>;
}

export default function ProportionsTab({ customer, latestSet, onCustomerSaved }) {
  const [observation, setObservation] = useState(customer.designer_fit_observation || '');
  const [saving, setSaving] = useState(false);
  const ratios = useMemo(() => computeProportionRatios(latestSet), [latestSet]);
  const asymmetry = useMemo(() => detectAsymmetry(latestSet), [latestSet]);

  const saveObservation = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Customer.update(customer.id, { designer_fit_observation: observation });
      onCustomerSaved(updated);
    } finally { setSaving(false); }
  };

  if (!latestSet) return <div className="bg-white border border-[#E7E5E4] rounded-sm p-8 text-center text-sm text-stone-400">Add a measurement set first to see proportions.</div>;

  return (
    <div className="space-y-5">
      <p className="text-xs text-stone-400 bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm p-3">These are garment-fitting and pattern-making observations only — not medical or biological assessments.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Body Proportion Ratios</h3>
          <RatioRow label="Torso-to-Height" value={ratios?.torsoToHeightRatio} />
          <RatioRow label="Leg-to-Height" value={ratios?.legToHeightRatio} />
          <RatioRow label="Upper-to-Lower Body" value={ratios?.upperToLowerRatio} />
          <RatioRow label="Shoulder-to-Waist" value={ratios?.shoulderToWaistRatio} />
          <RatioRow label="Waist-to-Hip" value={ratios?.waistToHipRatio} />
          <RatioRow label="Bust-to-Waist" value={ratios?.bustToWaistRatio} />
          <RatioRow label="Hip-to-Waist" value={ratios?.hipToWaistRatio} />
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Suggested Classification</h3>
          <p className="text-sm text-stone-600 mb-2">Torso: <span className="font-medium text-[#1C1917]">{ratios?.torsoClassification || latestSet.torso_proportion || '—'}</span></p>
          <p className="text-sm text-stone-600 mb-2">Legs: <span className="font-medium text-[#1C1917]">{ratios?.legClassification || latestSet.leg_proportion_overall || '—'}</span></p>
          <p className="text-sm text-stone-600">Overall: <span className="font-medium text-[#1C1917]">{ratios?.overallClassification || latestSet.overall_proportion || '—'}</span></p>
          <p className="text-[11px] text-stone-400 mt-3">Suggested from the latest measurement set — edit the set directly to override with the designer's own classification.</p>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" /> Left / Right Differences</h3>
        {asymmetry.length === 0 ? <p className="text-sm text-stone-400">No meaningful left/right differences detected.</p> : (
          <div className="space-y-2">
            {asymmetry.map(a => (
              <p key={a.label} className="text-sm text-stone-600">Measurement difference detected — {a.label}: left {a.left}, right {a.right}. Review for pattern adjustment.</p>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Designer Fit Observation</h3>
        <Textarea rows={3} value={observation} onChange={e => setObservation(e.target.value)} placeholder="e.g. Customer has a defined waist and fuller hip. Allow additional ease through hip while maintaining a fitted waist." />
        <Button size="sm" disabled={saving} onClick={saveObservation} className="mt-2 bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Save Observation'}</Button>
      </div>
    </div>
  );
}