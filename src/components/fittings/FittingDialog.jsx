import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

export default function FittingDialog({ open, onOpenChange, orders, onSaved, defaultDate }) {
  const [form, setForm] = useState({ order_id: '', date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ order_id: '', date: defaultDate || '' });
  }, [open, defaultDate]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Fitting.create({ order_id: form.order_id, date: form.date, status: 'Scheduled' });
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Schedule Fitting</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Order</Label>
            <Select required value={form.order_id} onValueChange={v => setForm({ ...form, order_id: v })}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Choose an order" /></SelectTrigger>
              <SelectContent>
                {orders.map(o => <SelectItem key={o.id} value={o.id}>{o.garment_design?.slice(0, 40) || 'Untitled garment'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label>
            <Input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <DialogFooter><Button type="submit" disabled={saving || !form.order_id || !form.date} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Schedule'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}