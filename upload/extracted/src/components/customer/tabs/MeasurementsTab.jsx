import React, { useState } from 'react';
import { Plus, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MeasurementSetCard from '@/components/customer/MeasurementSetCard';
import MeasurementSetDialog from '@/components/customer/MeasurementSetDialog';
import MeasurementCompareDialog from '@/components/customer/MeasurementCompareDialog';

export default function MeasurementsTab({ sets, uMap, customerId, userId, onReload }) {
  const [open, setOpen] = useState(false);
  const [duplicateFrom, setDuplicateFrom] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2"><Ruler className="w-3.5 h-3.5" /> Body Measurements & Proportions</h3>
        <div className="flex items-center gap-2">
          {sets.length > 1 && <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setCompareOpen(true)}>Compare</Button>}
          <Button size="sm" className="gap-1.5 rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white" onClick={() => { setDuplicateFrom(null); setOpen(true); }}><Plus className="w-3.5 h-3.5" /> New Set</Button>
        </div>
      </div>
      <div className="p-5">
        {sets.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No measurement sets recorded yet.</p> : (
          <div className="space-y-3">
            {sets.map((s, i) => (
              <MeasurementSetCard key={s.id} set={s} uMap={uMap} latest={i === 0} onDuplicate={(set) => { setDuplicateFrom(set); setOpen(true); }} />
            ))}
          </div>
        )}
      </div>
      <MeasurementSetDialog open={open} onOpenChange={setOpen} customerId={customerId} taker={userId} duplicateFrom={duplicateFrom} onSaved={onReload} />
      <MeasurementCompareDialog open={compareOpen} onOpenChange={setCompareOpen} sets={sets} />
    </div>
  );
}