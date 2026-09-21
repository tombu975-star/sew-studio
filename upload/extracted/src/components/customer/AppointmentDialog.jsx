import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const TYPES = ['Consultation', 'Measurement', 'Design Review', 'Fabric Selection', 'First Fitting', 'Second Fitting', 'Final Fitting', 'Collection', 'Other'];

export default function AppointmentDialog({ open, onOpenChange, customerId, users, orders, onSaved }) {
  const [f, setF] = useState({ type: 'Consultation', date: todayISO(), time: '', staff_id: '', location: '', purpose: '', notes: '', order_id: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...f, customer_id: customerId };
      if (!payload.staff_id) delete payload.staff_id;
      if (!payload.order_id) delete payload.order_id;
      await base44.entities.Appointment.create(payload);
      setF({ type: 'Consultation', date: todayISO(), time: '', staff_id: '', location: '', purpose: '', notes: '', order_id: '' });
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">New Appointment</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={f.type} onValueChange={v => set('type', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Staff Member</Label>
              <Select value={f.staff_id} onValueChange={v => set('staff_id', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" required value={f.date} onChange={e => set('date', e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={f.time} onChange={e => set('time', e.target.value)} /></div>
          </div>
          <div><Label>Location</Label><Input value={f.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Studio" /></div>
          {orders.length > 0 && (
            <div><Label>Related Order</Label>
              <Select value={f.order_id} onValueChange={v => set('order_id', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.garment_design || 'Untitled garment'}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
          <div><Label>Purpose</Label><Textarea rows={2} value={f.purpose} onChange={e => set('purpose', e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save Appointment'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}