import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const STYLES = ['Classic', 'Modern', 'Minimal', 'Dramatic', 'Elegant', 'Traditional', 'Trendy', 'Modest', 'Custom'];
const FITS = ['Bodycon', 'Very Fitted', 'Fitted', 'Semi-Fitted', 'Regular', 'Relaxed', 'Oversized'];
const CHARACTERISTICS = ['Balanced', 'Defined Waist', 'Fuller Bust', 'Fuller Hip', 'Curvier Lower Body', 'Curvier Upper Body', 'Straight Proportion', 'Other'];

export default function EditStyleDialog({ open, onOpenChange, customer, onSaved }) {
  const [f, setF] = useState(() => ({ ...customer, preferred_styles: customer.preferred_styles || [], fit_characteristics: customer.fit_characteristics || [] }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = (key, val) => setF(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val] }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const patch = { ...f };
      delete patch.id;
      const updated = await base44.entities.Customer.update(customer.id, patch);
      onOpenChange(false);
      onSaved(updated);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Style & Fit Profile</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Preferred Styles</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {STYLES.map(s => <button type="button" key={s} onClick={() => toggle('preferred_styles', s)} className={`text-xs px-2.5 py-1 rounded-full border ${f.preferred_styles.includes(s) ? 'bg-[#800020] text-white border-[#800020]' : 'border-[#E7E5E4] text-stone-500'}`}>{s}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Favourite Colours</Label><Input value={f.favourite_colours || ''} onChange={e => set('favourite_colours', e.target.value)} /></div>
            <div><Label>Colours to Avoid</Label><Input value={f.colours_to_avoid || ''} onChange={e => set('colours_to_avoid', e.target.value)} /></div>
            <div><Label>Favourite Fabrics</Label><Input value={f.favourite_fabrics || ''} onChange={e => set('favourite_fabrics', e.target.value)} /></div>
            <div><Label>Fabrics to Avoid</Label><Input value={f.fabrics_to_avoid || ''} onChange={e => set('fabrics_to_avoid', e.target.value)} /></div>
          </div>
          <div><Label>Design Preferences</Label><Textarea rows={2} value={f.design_preferences || ''} onChange={e => set('design_preferences', e.target.value)} placeholder="Neckline, sleeves, silhouette, skirt shape, embellishment…" /></div>
          <div><Label>Style Notes</Label><Textarea rows={2} value={f.style_notes || ''} onChange={e => set('style_notes', e.target.value)} /></div>

          <div className="pt-2 border-t border-[#E7E5E4]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Fit Preferences</p>
            <div><Label>Preferred Fit</Label>
              <Select value={f.preferred_fit || ''} onValueChange={v => set('preferred_fit', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{FITS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="mt-3">
              <Label>Fit / Body Characteristics</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {CHARACTERISTICS.map(s => <button type="button" key={s} onClick={() => toggle('fit_characteristics', s)} className={`text-xs px-2.5 py-1 rounded-full border ${f.fit_characteristics.includes(s) ? 'bg-[#800020] text-white border-[#800020]' : 'border-[#E7E5E4] text-stone-500'}`}>{s}</button>)}
              </div>
            </div>
          </div>

          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}