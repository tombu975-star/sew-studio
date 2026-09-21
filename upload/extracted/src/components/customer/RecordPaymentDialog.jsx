import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function RecordPaymentDialog({ open, onOpenChange, orders, onSaved }) {
  const [f, setF] = useState({ order_id: '', amount: '', date: todayISO(), type: 'Instalment', method: 'Cash' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.order_id) return;
    setSaving(true);
    try {
      await base44.entities.Payment.create({ ...f, amount: Number(f.amount) || 0 });
      setF({ order_id: '', amount: '', date: todayISO(), type: 'Instalment', method: 'Cash' });
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Order *</Label>
            <Select value={f.order_id} onValueChange={v => set('order_id', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Select order" /></SelectTrigger>
              <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.garment_design || 'Untitled garment'}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Amount</Label><Input type="number" required value={f.amount} onChange={e => set('amount', e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={f.date} onChange={e => set('date', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={f.type} onValueChange={v => set('type', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Deposit', 'Instalment', 'Final'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Method</Label>
              <Select value={f.method} onValueChange={v => set('method', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Cash', 'Mobile Money', 'Bank'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={saving || !orders.length} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : orders.length ? 'Record Payment' : 'No orders yet'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}