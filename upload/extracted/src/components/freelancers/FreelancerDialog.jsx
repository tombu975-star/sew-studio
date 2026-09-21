import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function FreelancerDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', specialty: '', phone: '', rate_notes: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      setForm({ name: '', specialty: '', phone: '', rate_notes: '' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Add Freelancer</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Specialty</Label><Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. Beading, Embroidery, Pattern Cutting" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Rate Notes</Label><Textarea value={form.rate_notes} onChange={e => setForm({ ...form, rate_notes: e.target.value })} placeholder="What you usually pay them and when" /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Add Freelancer'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}