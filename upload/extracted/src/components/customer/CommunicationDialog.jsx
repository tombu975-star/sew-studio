import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function CommunicationDialog({ open, onOpenChange, customerId, staffId, onSaved }) {
  const [f, setF] = useState({ type: 'WhatsApp', date: todayISO(), time: '', summary: '', follow_up_required: false, follow_up_date: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.CommunicationLog.create({ ...f, customer_id: customerId, staff_id: staffId });
      setF({ type: 'WhatsApp', date: todayISO(), time: '', summary: '', follow_up_required: false, follow_up_date: '' });
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Log Communication</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={f.type} onValueChange={v => set('type', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Call', 'WhatsApp', 'Email', 'Message', 'Other'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Date</Label><Input type="date" required value={f.date} onChange={e => set('date', e.target.value)} /></div>
          </div>
          <div><Label>Summary</Label><Textarea required rows={3} value={f.summary} onChange={e => set('summary', e.target.value)} placeholder="What was discussed?" /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}