import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function JobDialog({ freelancer, orders, open, onClose, onSave }) {
  const [form, setForm] = useState({ task_description: '', order_id: '', cost: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ task_description: '', order_id: '', cost: '', due_date: '' });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        freelancer_id: freelancer.id,
        task_description: form.task_description,
        order_id: form.order_id || null,
        cost: Number(form.cost) || 0,
        due_date: form.due_date || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Commission {freelancer?.name}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Task</Label><Input required value={form.task_description} onChange={e => setForm({ ...form, task_description: e.target.value })} placeholder="e.g. Hand-bead bodice panels" /></div>
          <div><Label>For Order (optional)</Label>
            <Select value={form.order_id || undefined} onValueChange={v => setForm({ ...form, order_id: v })}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Link to an order" /></SelectTrigger>
              <SelectContent>
                {orders.map(o => <SelectItem key={o.id} value={o.id}>{(o.garment_design || 'Untitled garment').slice(0, 40)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cost</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Commission Job'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}