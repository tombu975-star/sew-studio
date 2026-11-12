import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import { formatCurrency, formatDate } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import AssetBadge from '@/components/AssetBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const today = () => new Date().toISOString().slice(0, 10);

export default function AssetDetail() {
  const { id } = useParams();
  const [asset, setAsset] = useState(undefined);
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today(), performed_by: '', artisan_id: '', notes: '', next_due: '' });

  useEffect(() => {
    base44.entities.Asset.get(id).then(setAsset).catch(() => setAsset(null));
    base44.entities.AssetMaintenance.list('-date', 500)
      .then(rows => setEntries(rows.filter(r => r.asset_id === id)))
      .catch(console.error);
    fetchUsers().then(setUsers).catch(() => setUsers([]));
    base44.entities.Artisan.list('-created_date', 200).then(setArtisans).catch(() => setArtisans([]));
  }, [id]);

  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);
  const artisanMap = useMemo(() => Object.fromEntries(artisans.map(a => [a.id, a])), [artisans]);
  const staff = userMap[asset?.assigned_staff_id];

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.AssetMaintenance.create({
        asset_id: id,
        date: form.date,
        performed_by: form.performed_by || undefined,
        artisan_id: form.artisan_id || undefined,
        notes: form.notes,
      });
      // Update the service schedule: last serviced + optional next checkup
      const patch = {};
      if (!asset?.last_service_date || form.date > asset.last_service_date) patch.last_service_date = form.date;
      if (form.next_due) patch.next_service_due = form.next_due;
      if (asset && Object.keys(patch).length > 0) setAsset(await base44.entities.Asset.update(asset.id, patch));
      setOpen(false);
      setForm({ date: today(), performed_by: '', artisan_id: '', notes: '', next_due: '' });
      const rows = await base44.entities.AssetMaintenance.list('-date', 500);
      setEntries(rows.filter(r => r.asset_id === id));
    } finally {
      setSaving(false);
    }
  };

  if (asset === undefined) return <div className="p-10 text-stone-400 text-sm">Loading asset…</div>;
  if (asset === null) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-stone-500 mb-4">This asset could not be found.</p>
        <Link to="/assets" className="text-[#800020] text-sm font-medium hover:underline">Back to Asset Register</Link>
      </div>
    );
  }

  const info = [
    { label: 'Category', value: asset.category },
    { label: 'Location / Station', value: asset.location },
    { label: 'Purchase Date', value: formatDate(asset.purchase_date) },
    { label: 'Purchase Cost', value: asset.purchase_cost != null ? formatCurrency(asset.purchase_cost) : '' },
    { label: 'Assigned Staff', value: staff ? (staff.full_name || staff.email) : '' },
    { label: 'Last Serviced', value: formatDate(asset.last_service_date) },
    { label: 'Next Checkup Due', value: formatDate(asset.next_service_due) },
  ];

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <Link to="/assets" className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-[#800020] mb-4"><ChevronLeft className="w-3.5 h-3.5" /> Asset Register</Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>{asset.name}</h1>
          <div className="flex items-center gap-2 mt-3">
            <AssetBadge value={asset.condition} />
            <AssetBadge value={asset.status} kind="status" />
          </div>
        </div>
      </div>

      <AtelierCard title="Details" className="mb-4 md:mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {info.map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400">{label}</p>
              <p className="text-sm text-[#1C1917] mt-0.5">{value || '—'}</p>
            </div>
          ))}
        </div>
      </AtelierCard>

      <AtelierCard
        title="Maintenance History"
        action={<Button onClick={() => setOpen(true)} size="sm" className="bg-[#800020] hover:bg-[#6b0018] rounded-sm h-7 px-3 text-[11px]"><Plus className="w-3 h-3" /> Log Service / Repair</Button>}
      >
        {entries.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No maintenance logged yet.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {entries.map(en => (
              <div key={en.id} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-[#1C1917] flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-stone-400" />{en.artisan_id ? (artisanMap[en.artisan_id]?.name || 'Artisan') : (en.performed_by || 'Service entry')}</p>
                  <p className="text-xs text-stone-400 shrink-0">{formatDate(en.date)}</p>
                </div>
                {en.notes && <p className="text-xs text-stone-500 mt-1 leading-relaxed whitespace-pre-line">{en.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </AtelierCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Log Service / Repair</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Artisan (who did the work)</Label>
              <Select value={form.artisan_id} onValueChange={v => setForm(f => ({ ...f, artisan_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select artisan (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / in-house</SelectItem>
                  {artisans.map(a => <SelectItem key={a.id} value={a.id}>{a.name} — {a.trade}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Done By</Label>
              <Input value={form.performed_by} onChange={e => setForm(f => ({ ...f, performed_by: e.target.value }))} placeholder="e.g. Madam, in-house (if no artisan)" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Next Checkup Due (optional)</Label>
              <Input type="date" value={form.next_due} onChange={e => setForm(f => ({ ...f, next_due: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Service done, repairs carried out, issues found…" required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm">{saving ? 'Saving…' : 'Save entry'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}