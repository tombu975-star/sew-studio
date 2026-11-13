import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function FeedbackDialog({ open, onOpenChange, customerId, staffId, onSaved }) {
  const [f, setF] = useState({ date: todayISO(), rating: '', type: 'General', feedback: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.CustomerFeedback.create({ ...f, rating: Number(f.rating) || undefined, customer_id: customerId, staff_responsible: staffId });
      setF({ date: todayISO(), rating: '', type: 'General', feedback: '' });
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Record Feedback</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" value={f.rating} onChange={e => set('rating', e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={f.type} onValueChange={v => set('type', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Compliment', 'Complaint', 'General'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div><Label>Feedback</Label><Textarea required rows={3} value={f.feedback} onChange={e => set('feedback', e.target.value)} /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}