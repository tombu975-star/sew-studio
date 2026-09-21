import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const EMPTY = { name: '', program: 'Apprenticeship', stage: 'Foundation', trainer_id: '', phone: '', start_date: '', notes: '' };

export default function TraineeDialog({ open, onClose, onSave }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      fetchUsers().then(setUsers).catch(() => setUsers([]));
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">New Trainee</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Full name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Program</Label>
              <Select value={form.program} onValueChange={v => setForm({ ...form, program: v })}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apprenticeship">Apprenticeship</SelectItem>
                  <SelectItem value="Master Class Attendee">Master Class Attendee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current stage</Label>
              <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Foundation">Foundation</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Trainer / Teacher</Label>
            <Select value={form.trainer_id || undefined} onValueChange={v => setForm({ ...form, trainer_id: v })}>
              <SelectTrigger className="rounded-sm"><SelectValue placeholder="Choose trainer" /></SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Add Trainee'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}