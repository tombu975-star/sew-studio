import React, { useEffect, useState } from 'react';
import { Shirt, Scissors, GraduationCap, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import EntrySourceFields, { entryFields } from '@/components/EntrySourceFields';

const STREAMS = [
  { type: 'Ready-to-Wear', icon: Shirt, classes: 'text-[#800020] bg-[#800020]/10' },
  { type: 'Alterations', icon: Scissors, classes: 'text-[#B45309] bg-[#B45309]/10' },
  { type: 'Training', icon: GraduationCap, classes: 'text-[#15803D] bg-[#15803D]/10' },
];

export default function IncomeStreams() {
  const [entries, setEntries] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'Ready-to-Wear', description: '', amount: '', date: todayISO(), entry_log: 'Self-Entered', logged_by: '', assisted_call_id: '' });

  const load = () => base44.entities.OtherIncome.list('-date', 200).then(setEntries).catch(console.error);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.OtherIncome.create({
        type: form.type,
        description: form.description,
        amount: Number(form.amount) || 0,
        date: form.date || todayISO(),
        ...entryFields(form),
      });
      setOpen(false);
      setForm({ type: 'Ready-to-Wear', description: '', amount: '', date: todayISO(), entry_log: 'Self-Entered', logged_by: '', assisted_call_id: '' });
      load();
    } finally { setSaving(false); }
  };

  const now = new Date();
  const list = entries || [];
  const thisMonth = list.filter(x => { const d = new Date(x.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Income Streams</h3>
        <span className="text-[10px] text-stone-400 hidden md:inline">Ready-to-Wear · Alterations · Training</span>
        <Button variant="outline" size="sm" className="ml-auto rounded-sm gap-1.5" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Log Income</Button>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {STREAMS.map(s => {
            const month = thisMonth.filter(x => x.type === s.type).reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
            const Icon = s.icon;
            return (
              <div key={s.type} className="border border-[#E7E5E4] rounded-sm p-4">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center ${s.classes}`}><Icon className="w-3.5 h-3.5" /></span>
                  <span className="text-xs font-medium text-stone-500">{s.type}</span>
                </div>
                <div className="font-display text-2xl font-semibold text-[#1C1917] mt-2 leading-none">{formatCurrency(month)}</div>
                <div className="text-[10px] text-stone-400 mt-1.5">this month</div>
              </div>
            );
          })}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-2">Recent Entries</p>
          {list.length === 0 ? (
            <p className="text-sm text-stone-400 py-3">No income logged yet.</p>
          ) : (
            <div className="divide-y divide-[#E7E5E4]">
              {list.slice(0, 5).map(x => {
                const s = STREAMS.find(s => s.type === x.type) || STREAMS[0];
                const Icon = s.icon;
                return (
                  <div key={x.id} className="flex items-center gap-3 py-2.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${s.classes}`}><Icon className="w-3.5 h-3.5" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1C1917] truncate">{x.description || x.type}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{x.type} · {formatDate(x.date)}</p>
                    </div>
                    <span className="text-sm font-medium text-[#1C1917]">{formatCurrency(x.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader><DialogTitle className="font-display text-2xl">Log Other Income</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Stream</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STREAMS.map(s => <SelectItem key={s.type} value={s.type}>{s.type}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount</Label><Input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. two RTW dresses sold, hem alteration, 2-day workshop" /></div>
            <EntrySourceFields value={form} onChange={patch => setForm(f => ({ ...f, ...patch }))} />
            <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Log Income'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}