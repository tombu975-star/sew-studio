import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function NoteDialog({ open, onOpenChange, customerId, userId, onSaved }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.CustomerNote.create({ customer_id: customerId, note, added_by: userId, date: todayISO() });
      setNote('');
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Add Internal Note</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Textarea rows={4} required value={note} onChange={e => setNote(e.target.value)} placeholder="What should the team remember about this customer?" />
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save Note'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}