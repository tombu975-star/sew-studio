import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['Fabric', 'Trims & Notions', 'Embellishments', 'Packing', 'Tools & Consumables', 'Other'];
const UNITS = ['Yards', 'Metres', 'Pieces', 'Rolls', 'Kg', 'Other'];

export default function StockItemDialog({ open, onOpenChange, suppliers, onSaved }) {
  const [form, setForm] = useState({ name: '', category: 'Fabric', unit: 'Yards', quantity: '', reorder_level: '', unit_cost: '', supplier_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const qty = Number(form.quantity) || 0;
      const created = await base44.entities.StockItem.create({
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        quantity: qty,
        reorder_level: Number(form.reorder_level) || 0,
        unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
        supplier_id: form.supplier_id || null,
        notes: form.notes || null,
      });
      if (qty > 0) {
        await base44.entities.StockMovement.create({
          item_id: created.id,
          date: new Date().toISOString().slice(0, 10),
          type: 'Stock In',
          quantity: qty,
          unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
          supplier_id: form.supplier_id || null,
          note: 'Opening stock',
        });
      }
      setForm({ name: '', category: 'Fabric', unit: 'Yards', quantity: '', reorder_level: '', unit_cost: '', supplier_id: '', notes: '' });
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add stock item</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Item name</Label>
            <Input required value={form.name} onChange={set('name')} placeholder="e.g. Ivory bridal satin" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Opening qty</Label>
              <Input type="number" min="0" value={form.quantity} onChange={set('quantity')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Reorder at</Label>
              <Input type="number" min="0" value={form.reorder_level} onChange={set('reorder_level')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cost / unit</Label>
              <Input type="number" min="0" value={form.unit_cost} onChange={set('unit_cost')} />
            </div>
          </div>
          {suppliers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Preferred supplier</Label>
              <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Shelf, colourway, width — anything worth remembering" />
          </div>
          <DialogFooter className="mt-1">
            <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm">{saving ? 'Adding…' : 'Add item'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}