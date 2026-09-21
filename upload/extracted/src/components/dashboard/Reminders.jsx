import React, { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate, todayISO } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Personal one-off reminders — "call the tailor on Friday" — that don't belong
// to any client record. Open ones also ride along in the daily 8 AM email.
export default function Reminders() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ note: '', date: todayISO() });
  const [saving, setSaving] = useState(false);

  const load = () => base44.entities.Reminder.list('-date', 200).then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.note) return;
    setSaving(true);
    try {
      await base44.entities.Reminder.create({ note: form.note, date: form.date || todayISO(), done: false });
      setForm({ note: '', date: todayISO() });
      load();
    } finally { setSaving(false); }
  };

  const toggle = async (r) => {
    await base44.entities.Reminder.update(r.id, { done: !r.done });
    load();
  };

  const remove = async (id) => {
    await base44.entities.Reminder.delete(id);
    load();
  };

  if (items === null) return null;

  const today = todayISO();
  const open = items.filter(r => !r.done).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const done = items.filter(r => r.done).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <AtelierCard title="Reminders">
      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="rounded-sm sm:w-40" />
        <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Call the tailor about the beading" className="rounded-sm flex-1" />
        <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5 shrink-0"><Plus className="w-4 h-4" /> Add</Button>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">No reminders — add one-off notes like "call the tailor on Friday".</p>
      ) : (
        <div className="divide-y divide-[#E7E5E4]">
          {open.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5">
              <button type="button" onClick={() => toggle(r)} title="Mark done" className="w-5 h-5 shrink-0 rounded-sm border border-stone-300 hover:border-[#800020] flex items-center justify-center" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1C1917] truncate">{r.note}</p>
                <p className={`text-[11px] mt-0.5 ${r.date < today ? 'text-[#800020] font-medium' : 'text-stone-400'}`}>
                  {r.date < today ? `Overdue — ${formatDate(r.date)}` : formatDate(r.date)}
                </p>
              </div>
              <button type="button" onClick={() => remove(r.id)} className="text-stone-300 hover:text-[#800020] shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {done.length > 0 && open.length > 0 && <div className="py-1"><span className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Completed</span></div>}
          {done.slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 opacity-55">
              <button type="button" onClick={() => toggle(r)} title="Reopen" className="w-5 h-5 shrink-0 rounded-sm bg-[#15803D]/10 border border-[#15803D]/30 flex items-center justify-center text-[#15803D]"><Check className="w-3.5 h-3.5" /></button>
              <p className="flex-1 min-w-0 text-sm text-stone-500 truncate line-through">{r.note}</p>
              <button type="button" onClick={() => remove(r.id)} className="text-stone-300 hover:text-[#800020] shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </AtelierCard>
  );
}