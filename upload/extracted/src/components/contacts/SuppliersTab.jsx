import React, { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const emptyForm = () => ({ name: '', phone: '', location: '', items_supplied: '', notes: '' });

export default function SuppliersTab() {
  const [suppliers, setSuppliers] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => base44.entities.Supplier.list('-created_date', 200).then(setSuppliers).catch(console.error);
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name || '', phone: s.phone || '', location: s.location || '', items_supplied: s.items_supplied || '', notes: s.notes || '' });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await base44.entities.Supplier.update(editing.id, { ...form });
      else await base44.entities.Supplier.create({ ...form });
      setOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <AtelierCard
        title={`${suppliers?.length ?? 0} Suppliers`}
        action={<Button onClick={openNew} size="sm" className="bg-[#800020] hover:bg-[#6b0018] rounded-sm h-7 px-3 text-[11px]"><Plus className="w-3 h-3" /> Add Supplier</Button>}
      >
        {!suppliers ? (
          <p className="text-sm text-stone-400 py-6 text-center">Loading suppliers…</p>
        ) : suppliers.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No suppliers yet — add where you buy your fabric, lace, buttons and trims.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {suppliers.map(s => (
              <div key={s.id} className="flex items-start gap-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1C1917]">{s.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{[s.items_supplied, s.location, s.phone].filter(Boolean).join(' · ')}</p>
                  {s.notes && <p className="text-xs text-stone-500 mt-1 whitespace-pre-line">{s.notes}</p>}
                </div>
                <button type="button" onClick={() => openEdit(s)} className="text-stone-300 hover:text-[#800020] shrink-0 pt-1"><Pencil className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </AtelierCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Makola Fabrics" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={set('phone')} placeholder="024…" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location</Label>
                <Input value={form.location} onChange={set('location')} placeholder="e.g. Makola Market, Accra" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Items Supplied</Label>
              <Textarea rows={2} value={form.items_supplied} onChange={set('items_supplied')} placeholder="e.g. Fabric, lace, buttons, zippers" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Anything worth remembering about this supplier" />
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