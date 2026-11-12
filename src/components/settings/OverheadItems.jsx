import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Itemized monthly overhead (rent, electricity, data, transport…).
// While at least one item exists, its total replaces the flat overhead amount
// everywhere True Cost is calculated (see fetchSettings in lib/costing.js).
export default function OverheadItems() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => base44.entities.OverheadItem.list('-created_date', 100).then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name || !Number(amount)) return;
    setSaving(true);
    try {
      await base44.entities.OverheadItem.create({ name, amount: Number(amount) || 0 });
      setName('');
      setAmount('');
      load();
    } finally { setSaving(false); }
  };

  const saveItem = async (item, patch) => {
    await base44.entities.OverheadItem.update(item.id, patch);
    load();
  };

  const remove = async (id) => {
    await base44.entities.OverheadItem.delete(id);
    load();
  };

  const list = items || [];
  const total = list.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-5 mb-4 md:mb-5">
      <div className="mb-1"><Label className="text-sm font-semibold text-[#1C1917]">Overhead Breakdown</Label></div>
      <p className="text-xs text-stone-400 mb-4">List your monthly studio overhead items — rent, electricity, data, transport, maintenance… While at least one item is listed, their total replaces the flat amount below and is added to every order's True Cost.</p>

      {list.length > 0 && (
        <div className="divide-y divide-[#E7E5E4] border-y border-[#E7E5E4] mb-4">
          {list.map(it => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-center py-2.5">
              <Input
                className="col-span-6 rounded-sm h-8"
                defaultValue={it.name}
                onBlur={e => { if (e.target.value !== it.name) saveItem(it, { name: e.target.value }); }}
              />
              <Input
                className="col-span-4 rounded-sm h-8"
                type="number"
                defaultValue={it.amount ?? 0}
                onBlur={e => saveItem(it, { amount: Number(e.target.value) || 0 })}
              />
              <button type="button" onClick={() => remove(it.id)} className="col-span-2 flex justify-end text-stone-400 hover:text-[#800020]"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="flex items-center justify-between py-2.5">
            <span className="text-xs font-medium text-stone-500">Total added to every order's True Cost</span>
            <span className="text-sm font-semibold text-[#800020]">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <form onSubmit={add} className="grid grid-cols-12 gap-2 items-center">
        <Input className="col-span-6 rounded-sm" placeholder="e.g. Electricity" value={name} onChange={e => setName(e.target.value)} />
        <Input className="col-span-4 rounded-sm" type="number" placeholder="Monthly amount" value={amount} onChange={e => setAmount(e.target.value)} />
        <Button type="submit" disabled={saving} className="col-span-2 bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5"><Plus className="w-4 h-4" /> Add</Button>
      </form>
    </div>
  );
}