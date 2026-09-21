import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function AssignDialog({ open, onOpenChange, sop, currentUser, onAssigned }) {
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [roleContext, setRoleContext] = useState('Staff');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers().then(setUsers).catch(() => setUsers([]));
      setAssignedTo('');
      setRoleContext('Staff');
      setDueDate('');
    }
  }, [open]);

  const assign = async () => {
    if (!assignedTo || !sop) return;
    setSaving(true);
    const assignment = await base44.entities.SOPAssignment.create({
      sop_id: sop.id,
      sop_version: sop.version || 1,
      sop_title_snapshot: sop.title,
      checklist_snapshot: sop.checklist_items || [],
      assigned_to: assignedTo,
      assigned_by: currentUser?.id,
      role_context: roleContext,
      due_date: dueDate || undefined,
      status: 'Assigned',
    });
    try {
      await base44.functions.invoke('notifyStaff', { kind: 'task_assigned', user_id: assignedTo, detail: `New SOP assigned: "${sop.title}"` });
    } catch { /* notification is best-effort */ }
    setSaving(false);
    onAssigned(assignment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Assign "{sop?.title}"</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Assign to</p>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Choose a person" /></SelectTrigger>
              <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Role Context</p>
            <Select value={roleContext} onValueChange={setRoleContext}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{['Staff', 'Trainee', 'Trainer', 'Madam'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Due Date (optional)</p>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm" />
          </div>
          <Button disabled={saving || !assignedTo} onClick={assign} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm w-full h-9 text-sm">
            Assign SOP
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}