import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditStyleDialog from '@/components/customer/EditStyleDialog';
import StyleHistoryPanel from '@/components/customer/StyleHistoryPanel';
import { base44 } from '@/api/base44Client';

function Row({ label, value }) {
  return <div className="flex justify-between text-sm py-2 border-b border-[#E7E5E4] last:border-0"><span className="text-stone-500">{label}</span><span className="font-medium text-[#1C1917] text-right max-w-[60%]">{value || '—'}</span></div>;
}

export default function StyleTab({ customer, onSaved }) {
  const [open, setOpen] = useState(false);
  const [concepts, setConcepts] = useState([]);

  useEffect(() => {
    base44.entities.StyleConcept.filter({ customer_id: customer.id }, '-created_date', 100).then(setConcepts);
  }, [customer.id]);

  return (
    <div>
      <div className="bg-white border border-[#E7E5E4] rounded-sm">
        <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Style Profile</h3>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-sm" onClick={() => setOpen(true)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(customer.preferred_styles || []).map(s => <span key={s} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#800020]/10 text-[#800020]">{s}</span>)}
            {(!customer.preferred_styles || customer.preferred_styles.length === 0) && <p className="text-sm text-stone-400">No preferred styles set.</p>}
          </div>
          <Row label="Favourite Colours" value={customer.favourite_colours} />
          <Row label="Colours to Avoid" value={customer.colours_to_avoid} />
          <Row label="Favourite Fabrics" value={customer.favourite_fabrics} />
          <Row label="Fabrics to Avoid" value={customer.fabrics_to_avoid} />
          <Row label="Design Preferences" value={customer.design_preferences} />
          <Row label="Style Notes" value={customer.style_notes} />
          <Row label="Preferred Fit" value={customer.preferred_fit} />
          <Row label="Fit Characteristics" value={(customer.fit_characteristics || []).join(', ')} />
        </div>
        <EditStyleDialog open={open} onOpenChange={setOpen} customer={customer} onSaved={onSaved} />
      </div>
      <StyleHistoryPanel concepts={concepts} />
    </div>
  );
}