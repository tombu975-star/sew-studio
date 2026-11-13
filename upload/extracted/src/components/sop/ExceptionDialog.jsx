import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const CATEGORIES = ['Human Error', 'Missing Information', 'Resource Shortage', 'Material Shortage', 'Customer-Related Issue', 'Equipment Problem', 'Staff Absence', 'Training / Skill Gap', 'Process Problem', 'Other'];

export default function ExceptionDialog({ open, onOpenChange, assignment, currentUser, onReported }) {
  const [category, setCategory] = useState('Process Problem');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!description.trim()) return;
    setSaving(true);
    const exception = await base44.entities.SOPException.create({
      assignment_id: assignment?.id,
      sop_id: assignment?.sop_id,
      order_id: assignment?.order_id || undefined,
      reported_by: currentUser?.id,
      date: new Date().toISOString().slice(0, 10),
      category,
      description: description.trim(),
      status: 'Open',
    });
    if (assignment?.id) {
      await base44.entities.SOPAssignment.update(assignment.id, { status: 'Exception' });
    }
    setSaving(false);
    setDescription('');
    onReported(exception);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Report a Problem</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Category</p>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What happened?" className="text-sm min-h-[70px]" />
          <Button disabled={saving || !description.trim()} onClick={submit} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm w-full h-9 text-sm">
            Report Problem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}