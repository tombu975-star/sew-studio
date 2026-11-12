import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AssistedCalls() {
  const [calls, setCalls] = useState(null);
  const [linked, setLinked] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), agent_name: '', owner_spoken_to: 'Madam', notes: '' });

  const load = () => {
    base44.entities.AssistedCallLog.list('-date', 200).then(setCalls).catch(() => setCalls([]));
    Promise.all([
      base44.entities.Order.list('-created_date', 500).catch(() => []),
      base44.entities.OrderMaterial.list('-created_date', 500).catch(() => []),
      base44.entities.OrderLabour.list('-created_date', 500).catch(() => []),
      base44.entities.Payment.list('-created_date', 500).catch(() => []),
      base44.entities.AccraRunItem.list('-created_date', 500).catch(() => []),
      base44.entities.OtherIncome.list('-created_date', 500).catch(() => []),
    ]).then(([orders, materials, labour, payments, tripItems, income]) => {
      const map = {};
      const push = (cid, kind, label, date) => { if (!map[cid]) map[cid] = []; map[cid].push({ kind, label, date }); };
      orders.forEach(r => r.assisted_call_id && push(r.assisted_call_id, 'Order', r.garment_design?.slice(0, 40) || 'Order', r.order_date));
      materials.forEach(r => r.assisted_call_id && push(r.assisted_call_id, 'Material', r.item_name, r.created_date));
      labour.forEach(r => r.assisted_call_id && push(r.assisted_call_id, 'Labour', r.task_description, r.created_date));
      payments.forEach(r => r.assisted_call_id && push(r.assisted_call_id, 'Payment', `${formatCurrency(r.amount)} ${r.type}`, r.date));
      tripItems.forEach(r => r.assisted_call_id && push(r.assisted_call_id, 'Accra Run Item', r.description, r.created_date));
      income.forEach(r => r.assisted_call_id && push(r.assisted_call_id, 'Income', `${r.type}${r.description ? ` — ${r.description}` : ''}`, r.date));
      Object.values(map).forEach(list => list.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLinked(map);
    });
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.AssistedCallLog.create({
        date: form.date || todayISO(),
        agent_name: form.agent_name || 'Sewsiness Assisted',
        owner_spoken_to: form.owner_spoken_to,
        notes: form.notes,
      });
      setForm({ date: todayISO(), agent_name: '', owner_spoken_to: 'Madam', notes: '' });
      load();
    } finally {
      setSaving(false);
    }
  };

  const list = calls || [];

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><Phone className="w-3.5 h-3.5" />Entry Source</p>
        <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>Assisted Call Log</h1>
        <p className="text-sm text-stone-500 mt-2">A record of data that came in by phone — what was logged during each call, and by whom.</p>
      </div>

      <AtelierCard title="Log an Assisted Call" className="mb-4 md:mb-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div><Label>Taken By</Label><Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} placeholder="Staff name or 'Sewsiness Assisted'" /></div>
            <div><Label>Business Owner Spoken To</Label><Input value={form.owner_spoken_to} onChange={e => setForm({ ...form, owner_spoken_to: e.target.value })} placeholder="e.g. Madam" /></div>
          </div>
          <div><Label>Call Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="What was discussed and what was agreed…" /></div>
          <div className="flex justify-end"><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Log Call'}</Button></div>
        </form>
      </AtelierCard>

      <AtelierCard title="Calls">
        {list.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No assisted calls logged yet.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {list.map(c => {
              const entries = linked[c.id] || [];
              return (
                <div key={c.id} className="py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-[#1C1917]">{formatDate(c.date)} — {c.owner_spoken_to || 'Owner'}</p>
                    <p className="text-xs text-stone-400 shrink-0">Taken by {c.agent_name}</p>
                  </div>
                  {c.notes && <p className="text-xs text-stone-500 mt-1.5 leading-relaxed whitespace-pre-line">{c.notes}</p>}
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400 mb-1.5">Entries logged during this call ({entries.length})</p>
                    {entries.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">Nothing linked to this call yet — pick it under "Assisted Call" when entering a record.</p>
                    ) : (
                      <ul className="space-y-1">
                        {entries.map((en, i) => (
                          <li key={i} className="text-xs text-stone-600 flex items-center gap-2">
                            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm">{en.kind}</span>
                            <span className="truncate">{en.label}</span>
                            {en.date && <span className="text-stone-300 shrink-0">· {formatDate(en.date)}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AtelierCard>
    </div>
  );
}