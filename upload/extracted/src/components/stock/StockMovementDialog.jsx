import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';

export default function StockMovementDialog({ open, onOpenChange, target, suppliers, orders, onSaved }) {
  const [form, setForm] = useState({ date: todayISO(), quantity: '', unit_cost: '', order_id: '', supplier_id: '', note: '' });
  const [saving, setSaving] = useState(false);

  const isIn = target?.type === 'Stock In';

  useEffect(() => {
    if (open) setForm({ date: todayISO(), quantity: '', unit_cost: '', order_id: '', supplier_id: '', note: '' });
  }, [open]);

  if (!target) return null;
  const { item, type } = target;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (!qty || qty <= 0) return;
    setSaving(true);
    try {
      await base44.entities.StockMovement.create({
        item_id: item.id,
        date: form.date,
        type,
        quantity: qty,
        unit_cost: isIn && form.unit_cost !== '' ? Number(form.unit_cost) : null,
        order_id: !isIn && form.order_id ? form.order_id : null,
        supplier_id: isIn && form.supplier_id ? form.supplier_id : null,
        note: form.note || null,
      });
      const newQty = Math.max(0, (item.quantity || 0) + (isIn ? qty : -qty));
      const patch = { quantity: newQty };
      if (isIn && form.unit_cost !== '') patch.unit_cost = Number(form.unit_cost);
      await base44.entities.StockItem.update(item.id, patch);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{type === 'Stock In' ? 'Stock in' : 'Take out'} — {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={set('date')} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Quantity ({item.unit.toLowerCase()})</Label>
              <Input type="number" min="0" step="any" value={form.quantity} onChange={set('quantity')} required />
            </div>
          </div>
          {isIn && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Cost / unit</Label>
                <Input type="number" min="0" step="any" value={form.unit_cost} onChange={set('unit_cost')} placeholder="Optional" />
              </div>
              {suppliers.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>Bought from</Label>
                  <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          {!isIn && orders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Used on order</Label>
              <Select value={form.order_id} onValueChange={v => setForm(f => ({ ...f, order_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={o.id}>{(o.garment_design || 'Custom garment').slice(0, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Note</Label>
            <Textarea rows={2} value={form.note} onChange={set('note')} placeholder={isIn ? 'Where it came from, price changes…' : 'Which garment or job it went into…'} />
          </div>
          <DialogFooter className="mt-1">
            <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm">
              {saving ? 'Saving…' : type === 'Stock In' ? 'Add to shelf' : 'Take out'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}