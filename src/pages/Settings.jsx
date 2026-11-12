import React, { useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchSettings } from '@/lib/costing';
import { useRole } from '@/lib/roles';
import OverheadItems from '@/components/settings/OverheadItems';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function Settings() {
  const { setOwnerLabel } = useRole();
  const [settings, setSettings] = useState(null);
  const [f, setF] = useState({ overhead_amount: '', outstanding_threshold: '', typical_load: '', margin_target: '' });
  const [gender, setGender] = useState('Female');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings().then(s => {
      setSettings(s);
      setF({ overhead_amount: s.overhead_amount ?? 0, outstanding_threshold: s.outstanding_threshold ?? 0, typical_load: s.typical_load ?? 5, margin_target: s.margin_target ?? 250 });
    }).catch(console.error);
    base44.auth.me().then(u => setGender(u?.gender || 'Female')).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await base44.entities.Settings.update(settings.id, {
        overhead_amount: Number(f.overhead_amount) || 0,
        outstanding_threshold: Number(f.outstanding_threshold) || 0,
        typical_load: Number(f.typical_load) || 0,
        margin_target: Number(f.margin_target) || 0,
      });
      await base44.auth.updateMe({ gender });
      setSettings(updated);
      setOwnerLabel(gender === 'Male' ? 'Master' : 'Madam');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  if (!settings) return <div className="p-10 text-sm text-stone-400">Loading settings…</div>;

  return (
    <div className="p-5 md:p-8 max-w-[600px] mx-auto">
      <h1 className="font-display font-semibold text-[#1C1917] flex items-center gap-3 mb-1" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>
        <SettingsIcon className="w-7 h-7 text-[#800020]" /> Studio Settings
      </h1>
      <p className="text-sm text-stone-500 mb-8">Cost and alert settings applied across the studio.</p>

      <OverheadItems />

      <form onSubmit={save} className="bg-white border border-[#E7E5E4] rounded-sm p-5 space-y-5">
        <div>
          <Label>Your Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-stone-400 mt-1.5">The owner role is automatically shown as "Madam" or "Master" across the app based on this.</p>
        </div>
        <div>
          <Label>Overhead per order</Label>
          <Input type="number" value={f.overhead_amount} onChange={e => setF({ ...f, overhead_amount: e.target.value })} className="rounded-sm" />
          <p className="text-xs text-stone-400 mt-1.5">A flat amount added once to every order's True Cost — used only while no items are listed in the Overhead Breakdown above.</p>
        </div>
        <div>
          <Label>Outstanding balance alert threshold</Label>
          <Input type="number" value={f.outstanding_threshold} onChange={e => setF({ ...f, outstanding_threshold: e.target.value })} className="rounded-sm" />
          <p className="text-xs text-stone-400 mt-1.5">You'll be alerted on the Dashboard when total outstanding across orders exceeds this.</p>
        </div>
        <div>
          <Label>Typical active work per staff member</Label>
          <Input type="number" value={f.typical_load} onChange={e => setF({ ...f, typical_load: e.target.value })} className="rounded-sm" />
          <p className="text-xs text-stone-400 mt-1.5">Open tasks + active orders one person can comfortably carry. Business Health flags anyone running significantly above this.</p>
        </div>
        <div>
          <Label>Healthy margin target per order</Label>
          <Input type="number" value={f.margin_target} onChange={e => setF({ ...f, margin_target: e.target.value })} className="rounded-sm" />
          <p className="text-xs text-stone-400 mt-1.5">Average margin per active order that counts as healthy in the Business Health score (Accra Run, quality and overdue-task benchmarks are fixed at 70%, 80% and 20%).</p>
        </div>
        <div className="pt-3 border-t border-[#E7E5E4] flex items-center justify-between">
          {saved && <span className="text-xs text-[#15803D] font-medium">Saved</span>}
          <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2 ml-auto">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}