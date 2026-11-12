import React, { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export const ARTISAN_TRADES = ['Machine Repairer', 'Electrician', 'Plumber', 'Carpenter', 'Other'];
const emptyForm = () => ({ name: '', trade: 'Machine Repairer', phone: '', location: '', rate_notes: '', last_used_date: '' });

export default function ArtisansTab() {
  const [artisans, setArtisans] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => base44.entities.Artisan.list('-created_date', 200).then(setArtisans).catch(console.error);
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({ name: a.name || '', trade: a.trade || 'Machine Repairer', phone: a.phone || '', location: a.location || '', rate_notes: a.rate_notes || '', last_used_date: a.last_used_date || '' });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, last_used_date: form.last_used_date || undefined };
      if (editing) await base44.entities.Artisan.update(editing.id, payload);
      else await base44.entities.Artisan.create(payload);
      setOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <AtelierCard
        title={`${artisans?.length ?? 0} Artisans`}
        action={<Button onClick={openNew} size="sm" className="bg-[#800020] hover:bg-[#6b0018] rounded-sm h-7 px-3 text-[11px]"><Plus className="w-3 h-3" /> Add Artisan</Button>}
      >
        {!artisans ? (
          <p className="text-sm text-stone-400 py-6 text-center">Loading artisans…</p>
        ) : artisans.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No artisans yet — add the people who repair machines, wiring and fittings.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {artisans.map(a => (
              <div key={a.id} className="flex items-start gap-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[#1C1917]">{a.name}</p>
                    <span className="text-[10px] uppercase tracking-wide bg-[#800020]/5 text-[#800020] px-1.5 py-0.5 rounded-full">{a.trade}</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">{[a.phone, a.location].filter(Boolean).join(' · ')}{a.last_used_date ? ` · Last used ${formatDate(a.last_used_date)}` : ''}</p>
                  {a.rate_notes && <p className="text-xs text-stone-500 mt-1 whitespace-pre-line">{a.rate_notes}</p>}
                </div>
                <button type="button" onClick={() => openEdit(a)} className="text-stone-300 hover:text-[#800020] shrink-0 pt-1"><Pencil className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </AtelierCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editing ? 'Edit Artisan' : 'Add Artisan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={set('name')} placeholder="e.g. Kofi Mensah" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Trade</Label>
                <Select value={form.trade} onValueChange={v => setForm(f => ({ ...f, trade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ARTISAN_TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={set('phone')} placeholder="024…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location</Label>
                <Input value={form.location} onChange={set('location')} placeholder="e.g. Kantamanto, Accra" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rate / Notes</Label>
              <Textarea rows={2} value={form.rate_notes} onChange={set('rate_notes')} placeholder="e.g. GHS 100 per service call, parts extra" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Last Used</Label>
              <Input type="date" value={form.last_used_date} onChange={set('last_used_date')} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm">{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}