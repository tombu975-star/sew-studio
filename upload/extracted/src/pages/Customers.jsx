import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, Phone, Mail } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { fetchCustomers, fetchOrders } from '@/lib/data';
import { base44 } from '@/api/base44Client';
import ClientSources from '@/components/clients/ClientSources';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const ENTRY_SOURCES = ['Instagram', 'Facebook', 'TikTok', 'WhatsApp', 'Referral', 'Walk-in', 'Repeat Client', 'Saw Our Work', 'Other'];
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';

export default function Customers() {
  const { isStaff, user } = useRole();
  const [customers, setCustomers] = useState(null);
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', entry_source: '', referred_by: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([fetchCustomers(), fetchOrders()]).then(([c, o]) => {
      setCustomers(c); setOrders(o);
    });
  };
  useEffect(load, []);

  const orderCounts = useMemo(() => {
    const map = {};
    orders.forEach(o => { map[o.customer_id] = (map[o.customer_id] || 0) + 1; });
    return map;
  }, [orders]);

  const visibleCustomers = useMemo(() => {
    if (!customers) return [];
    let list = customers;
    if (isStaff && user) {
      const myCust = new Set(orders.filter(o => o.assigned_staff_id === user.id).map(o => o.customer_id));
      list = list.filter(c => myCust.has(c.id));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
    }
    return list;
  }, [customers, query, isStaff, user, orders]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Customer.create(form);
      setForm({ name: '', phone: '', email: '', entry_source: '', referred_by: '', notes: '' });
      setOpen(false);
      load();
    } finally { setSaving(false); }
  };

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917]" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>Customers</h1>
          <p className="text-sm text-stone-500 mt-1">{customers ? `${visibleCustomers.length} clients` : 'Loading…'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2"><UserPlus className="w-4 h-4" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader><DialogTitle className="font-display text-2xl">New Customer</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div><Label htmlFor="n">Name</Label><Input id="n" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label htmlFor="p">Phone</Label><Input id="p" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label htmlFor="e">Email</Label><Input id="e" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label htmlFor="es">How did they find us?</Label>
                <Select value={form.entry_source} onValueChange={v => setForm({ ...form, entry_source: v })}>
                  <SelectTrigger id="es" className="rounded-sm"><SelectValue placeholder="Choose source" /></SelectTrigger>
                  <SelectContent>{ENTRY_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.entry_source === 'Referral' && (
                <div><Label htmlFor="rb">Referred By</Label><Input id="rb" value={form.referred_by} onChange={e => setForm({ ...form, referred_by: e.target.value })} placeholder="Who sent them?" /></div>
              )}
              <div><Label htmlFor="no">Notes</Label><Textarea id="no" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save Customer'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or phone…" className="pl-9 rounded-sm" />
      </div>

      {customers && !isStaff && customers.length > 0 && <ClientSources customers={customers} />}

      {!customers ? <p className="text-sm text-stone-400">Loading…</p> : visibleCustomers.length === 0 ? (
        <p className="text-sm text-stone-400 py-10 text-center">No customers found.</p>
      ) : (
        <div className="border border-[#E7E5E4] rounded-sm bg-white divide-y divide-[#E7E5E4]">
          {visibleCustomers.map(c => (
            <Link key={c.id} to={`/customers/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FBF9F7] transition group">
              <div className="w-10 h-10 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center font-display font-semibold text-[#800020]">
                {(c.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1C1917] group-hover:text-[#800020]">{c.name}</p>
                <div className="flex items-center gap-4 text-xs text-stone-400 mt-0.5">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                </div>
              </div>
              <span className="text-xs text-stone-400">{orderCounts[c.id] || 0} order{(orderCounts[c.id] || 0) !== 1 ? 's' : ''}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}