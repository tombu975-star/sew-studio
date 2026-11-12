import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const DEFAULTS = {
  deposit_percent: 50,
  rush_fee_percent: 25,
  quote_valid_days: 14,
  free_fittings: 2,
  alterations_window_days: 14,
  balance_before_pickup: true,
  deposit_policy: '',
  cancellation_policy: '',
};

export default function Policies() {
  const [form, setForm] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    base44.entities.Policy.list().then(list => {
      if (list.length > 0) {
        const p = list[0];
        setRecordId(p.id);
        setForm({ ...DEFAULTS, ...p });
      } else {
        setForm({ ...DEFAULTS });
      }
    }).catch(() => setForm({ ...DEFAULTS }));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value === '' ? '' : Number(e.target.value) }));
  const setText = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (recordId) {
        await base44.entities.Policy.update(recordId, payload);
      } else {
        const created = await base44.entities.Policy.create(payload);
        setRecordId(created.id);
      }
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="p-10 text-stone-400 text-sm">Loading your policies…</div>;

  return (
    <div className="p-5 md:p-8 max-w-[800px] mx-auto">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><ScrollText className="w-3.5 h-3.5" />How the studio runs</p>
        <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>Business Policies</h1>
        <p className="text-sm text-stone-500 mt-2">Your rules, written once — clients see them on their portal every time they check an order.</p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-4">
        <AtelierCard title="Money">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Deposit required (%)</Label>
              <Input type="number" min="0" max="100" value={form.deposit_percent} onChange={set('deposit_percent')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rush fee (%)</Label>
              <Input type="number" min="0" max="200" value={form.rush_fee_percent} onChange={set('rush_fee_percent')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Quote valid for (days)</Label>
              <Input type="number" min="1" value={form.quote_valid_days} onChange={set('quote_valid_days')} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-[#E7E5E4]">
            <div>
              <p className="text-sm font-medium text-[#1C1917]">Full balance before pickup</p>
              <p className="text-xs text-stone-400 mt-0.5">The garment is only released once it's fully paid.</p>
            </div>
            <Switch checked={!!form.balance_before_pickup} onCheckedChange={v => setForm(f => ({ ...f, balance_before_pickup: v }))} />
          </div>
        </AtelierCard>

        <AtelierCard title="Fittings & Alterations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Fittings included</Label>
              <Input type="number" min="0" value={form.free_fittings} onChange={set('free_fittings')} />
              <p className="text-[11px] text-stone-400">Included in the order price — extra fittings are charged.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Alterations window (days)</Label>
              <Input type="number" min="0" value={form.alterations_window_days} onChange={set('alterations_window_days')} />
              <p className="text-[11px] text-stone-400">Days after delivery to bring the garment back for adjustments.</p>
            </div>
          </div>
        </AtelierCard>

        <AtelierCard title="In your words">
          <p className="text-xs text-stone-400 mb-3">These are shown to clients exactly as written, at the bottom of their portal.</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Deposit policy</Label>
              <Textarea rows={3} value={form.deposit_policy} onChange={setText('deposit_policy')} placeholder="e.g. A 50% deposit confirms your order and covers materials. Work begins once it's received." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cancellation policy</Label>
              <Textarea rows={3} value={form.cancellation_policy} onChange={setText('cancellation_policy')} placeholder="e.g. Deposits become non-refundable once cutting has begun — fabric is bought for you." />
            </div>
          </div>
        </AtelierCard>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm self-start">{saving ? 'Saving…' : 'Save policies'}</Button>
          {savedAt && !saving && <span className="text-[11px] text-stone-400">Saved — clients will see these on their portal.</span>}
        </div>
      </form>
    </div>
  );
}