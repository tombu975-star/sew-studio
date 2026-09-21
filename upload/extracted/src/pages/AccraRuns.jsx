import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Bus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchUsers, fetchTrips, fetchTripItems, userMap } from '@/lib/data';
import { formatDate, todayISO } from '@/lib/format';
import { tripFulfilment } from '@/lib/costing';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function AccraRuns() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [t, setT] = useState({ date: todayISO(), shopper_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchTrips(), fetchTripItems(), fetchUsers()])
      .then(([tr, it, u]) => { setTrips(tr); setItems(it); setUsers(u); })
      .catch(console.error);
  }, []);

  const uMap = useMemo(() => userMap(users), [users]);

  const create = async (e) => {
    e.preventDefault();
    if (!t.date) return;
    setSaving(true);
    try {
      const trip = await base44.entities.AccraRunTrip.create({ date: t.date, shopper_id: t.shopper_id, status: 'Planned' });
      setOpen(false);
      navigate(`/accra-runs/${trip.id}`);
    } finally { setSaving(false); }
  };

  if (!trips) return <div className="p-10 text-sm text-stone-400">Loading trips…</div>;

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917] flex items-center gap-3" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>
            <Bus className="w-7 h-7 text-[#800020]" /> Accra Runs
          </h1>
          <p className="text-sm text-stone-500 mt-1">Plan shopping trips and log what actually came back.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5"><Plus className="w-4 h-4" /> New Trip</Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader><DialogTitle className="font-display text-2xl">New Accra Run</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Trip Date</Label><Input type="date" required value={t.date} onChange={e => setT({ ...t, date: e.target.value })} /></div>
              <div><Label>Shopper</Label>
                <Select value={t.shopper_id} onValueChange={v => setT({ ...t, shopper_id: v })}>
                  <SelectTrigger className="rounded-sm"><SelectValue placeholder="Who is going?" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Create Trip'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {trips.length === 0 ? (
        <div className="border border-dashed border-[#E7E5E4] rounded-sm p-10 text-center text-sm text-stone-400">
          No trips yet — create your first Accra Run.
        </div>
      ) : (
        <div className="space-y-2">
          {trips.map(tr => {
            const rate = tripFulfilment(tr.id, items);
            const count = items.filter(i => i.trip_id === tr.id).length;
            return (
              <Link key={tr.id} to={`/accra-runs/${tr.id}`} className="flex items-center gap-4 border border-[#E7E5E4] rounded-sm bg-white p-4 hover:border-[#800020]/40 transition">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1C1917]">{formatDate(tr.date)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {uMap[tr.shopper_id]?.full_name || uMap[tr.shopper_id]?.email || 'Shopper not set'} · {count} item{count !== 1 ? 's' : ''}
                  </p>
                </div>
                {tr.status === 'Logged' && rate !== null && (
                  <span className={cn('text-xs font-medium', rate < 0.7 ? 'text-[#800020]' : 'text-stone-500')}>
                    {Math.round(rate * 100)}% obtained
                  </span>
                )}
                <StatusBadge status={tr.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}