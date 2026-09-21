import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function PortfolioReviewDialog({ open, item, onClose, onSave }) {
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState('3');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setFeedback(item?.trainer_feedback || ''); setScore(String(item?.trainer_score || 3)); }
  }, [open, item]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(item.id, { trainer_feedback: feedback, trainer_score: Number(score) });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Review "{item?.title}"</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Score (1-5)</Label>
            <Select value={score} onValueChange={setScore}>
              <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Feedback</Label><Textarea rows={4} required value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What worked well, what to improve…" /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Save Review'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}