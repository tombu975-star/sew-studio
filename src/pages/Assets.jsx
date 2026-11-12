import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import { formatDate } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import AssetBadge, { ASSET_CATEGORIES, ASSET_CONDITIONS, ASSET_STATUSES } from '@/components/AssetBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const emptyForm = () => ({ name: '', category: 'Machine', purchase_date: '', purchase_cost: '', condition: 'Good', status: 'In Use', location: '', assigned_staff_id: '' });

export default function Assets() {
  const [assets, setAssets] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ category: 'All', status: 'All' });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => base44.entities.Asset.list('-created_date', 200).then(setAssets).catch(console.error);

  useEffect(() => {
    load();
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);
  const filtered = (assets || []).filter(a =>
    (filters.category === 'All' || a.category === filters.category) &&
    (filters.status === 'All' || a.status === filters.status)
  );

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Asset.create({
        name: form.name,
        category: form.category,
        purchase_date: form.purchase_date || undefined,
        purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : undefined,
        condition: form.condition,
        status: form.status,
        location: form.location || undefined,
        assigned_staff_id: form.assigned_staff_id || undefined,
      });
      setOpen(false);
      setForm(emptyForm());
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2">Studio Equipment</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>Asset Register</h1>
          <p className="text-sm text-stone-500 mt-2">Every machine, tool and piece of equipment — with its condition and maintenance history.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm self-start md:self-auto"><Plus className="w-4 h-4" /> Add Asset</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filters.category} onValueChange={v => setFilters(f => ({ ...f, category: v }))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <AtelierCard title={`${filtered.length} Asset${filtered.length !== 1 ? 's' : ''}`}>
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">{assets ? 'No assets match these filters.' : 'Loading assets…'}</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {filtered.map(a => {
              const staff = userMap[a.assigned_staff_id];
              return (
                <Link key={a.id} to={`/assets/${a.id}`} className="flex items-center gap-3 md:gap-4 py-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1917] group-hover:text-[#800020] truncate">{a.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {a.category}{a.location ? ` · ${a.location}` : ''}{staff ? ` · ${staff.full_name || staff.email}` : ''}
                      {a.next_service_due && (
                        <> · <span className={new Date(a.next_service_due) <= new Date() ? 'text-[#800020] font-medium' : ''}>Next checkup {formatDate(a.next_service_due)}</span></>
                      )}
                    </p>
                  </div>
                  <AssetBadge value={a.condition} />
                  <AssetBadge value={a.status} kind="status" />
                  <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </AtelierCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Juki DDL-8700 sewing machine" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Location / Station</Label>
                <Input value={form.location} onChange={set('location')} placeholder="e.g. Cutting table area" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchase_date} onChange={set('purchase_date')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Purchase Cost (GHS)</Label>
                <Input type="number" min="0" step="0.01" value={form.purchase_cost} onChange={set('purchase_cost')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assigned Staff (optional)</Label>
              <Select value={form.assigned_staff_id} onValueChange={v => setForm(f => ({ ...f, assigned_staff_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm">{saving ? 'Saving…' : 'Add asset'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}