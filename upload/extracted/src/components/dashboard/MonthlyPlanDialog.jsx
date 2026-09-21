import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function MonthlyPlanDialog({ open, onClose, onSave, monthKey, monthLabel, plan }) {
  const [occasion, setOccasion] = useState('');
  const [events, setEvents] = useState([]);
  const [eventInput, setEventInput] = useState('');
  const [notes, setNotes] = useState('');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOccasion(plan?.occasion || '');
      setEvents(plan?.events || []);
      setEventInput('');
      setNotes(plan?.notes || '');
      setTarget(plan?.target_revenue != null ? String(plan.target_revenue) : '');
    }
  }, [open, plan]);

  const addEvent = () => {
    const t = eventInput.trim();
    if (t && !events.includes(t)) setEvents([...events, t]);
    setEventInput('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        month: monthKey,
        occasion: occasion.trim() || null,
        events: events.length ? events : null,
        notes: notes.trim() || null,
        target_revenue: target === '' ? null : Number(target),
      });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Plan for {monthLabel}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Occasion / Season</Label>
            <Input value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="e.g. Wedding season, Homowo, Christmas" />
          </div>
          <div>
            <Label>Events & Festivals</Label>
            {events.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {events.map((ev, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">
                    {ev}
                    <button type="button" onClick={() => setEvents(events.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={eventInput} onChange={e => setEventInput(e.target.value)} placeholder="e.g. Homowo, Christmas, Detty December"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEvent(); } }} />
              <Button type="button" variant="outline" onClick={addEvent} className="rounded-sm shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <Label>Target Revenue</Label>
            <Input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 15000" />
          </div>
          <div>
            <Label>Notes — weather, plans, reminders</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Rains ease off — push fittings. Stock beading supplies early for December." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Save Plan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}