import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchUsers, fetchOrders, userMap } from '@/lib/data';
import { formatCurrency, formatDate } from '@/lib/format';
import { tripFulfilment } from '@/lib/costing';
import EntrySourceFields, { entryFields } from '@/components/EntrySourceFields';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function AccraRunDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [newItem, setNewItem] = useState({ description: '', planned_cost: '', order_id: '', supplier_id: '', entry_log: 'Self-Entered', logged_by: '', assisted_call_id: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    base44.entities.AccraRunTrip.get(id).then(setTrip).catch(() => setTrip(false));
    base44.entities.AccraRunItem.filter({ trip_id: id }, 'created_date', 200).then(setItems);
    fetchUsers().then(setUsers);
    fetchOrders().then(setOrders);
    base44.entities.Supplier.list('-created_date', 200).then(setSuppliers).catch(() => {});
  };
  useEffect(load, [id]);

  const uMap = useMemo(() => userMap(users), [users]);
  const orderById = useMemo(() => Object.fromEntries(orders.map(o => [o.id, o])), [orders]);
  const supMap = useMemo(() => Object.fromEntries(suppliers.map(s => [s.id, s])), [suppliers]);
  const logged = trip?.status === 'Logged';
  const rate = trip ? tripFulfilment(id, items) : null;
  const obtainedCount = items.filter(i => i.obtained).length;
  const plannedTotal = items.reduce((s, i) => s + (Number(i.planned_cost) || 0), 0);
  const actualTotal = items.reduce((s, i) => s + (Number(i.actual_cost) || 0), 0);

  const markLogged = async () => {
    const u = await base44.entities.AccraRunTrip.update(id, { status: 'Logged' });
    setTrip(u);
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.description) return;
    setSaving(true);
    try {
      await base44.entities.AccraRunItem.create({
        trip_id: id,
        description: newItem.description,
        planned_before: !logged,
        obtained: false,
        planned_cost: Number(newItem.planned_cost) || 0,
        order_id: newItem.order_id || null,
        supplier_id: newItem.supplier_id || null,
        ...entryFields(newItem),
      });
      setNewItem({ description: '', planned_cost: '', order_id: '', supplier_id: '', entry_log: 'Self-Entered', logged_by: '', assisted_call_id: '' });
      load();
    } finally { setSaving(false); }
  };

  const setObtained = async (item, obtained) => {
    await base44.entities.AccraRunItem.update(item.id, { obtained });
    load();
  };

  const saveActual = async (item, value) => {
    await base44.entities.AccraRunItem.update(item.id, { actual_cost: Number(value) || 0 });
    load();
  };

  const removeItem = async (itemId) => {
    await base44.entities.AccraRunItem.delete(itemId);
    load();
  };

  if (trip === null) return <div className="p-10 text-sm text-stone-400">Loading trip…</div>;
  if (trip === false) return <div className="p-10 text-sm text-stone-400">Trip not found.</div>;

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <Link to="/accra-runs" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-5"><ArrowLeft className="w-4 h-4" /> Accra Runs</Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917]" style={{ fontSize: 'clamp(26px, 4vw, 36px)' }}>Accra Run — {formatDate(trip.date)}</h1>
          <p className="text-sm text-stone-500 mt-1">Shopper: {uMap[trip.shopper_id]?.full_name || uMap[trip.shopper_id]?.email || '—'}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={trip.status} />
          {!logged && <Button onClick={markLogged} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">Mark Trip as Logged</Button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Items</span>
          <div className="font-display font-semibold text-[#1C1917] mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{items.length}</div>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Obtained</span>
          <div className="font-display font-semibold text-[#1C1917] mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{obtainedCount}</div>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Fulfilment</span>
          <div className="font-display font-semibold mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)', color: logged && rate !== null && rate < 0.7 ? '#800020' : '#1C1917' }}>
            {rate === null ? '—' : `${Math.round(rate * 100)}%`}
          </div>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{logged ? 'Actual Spend' : 'Planned Spend'}</span>
          <div className="font-display font-semibold text-[#1C1917] mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{formatCurrency(logged ? actualTotal : plannedTotal)}</div>
        </div>
      </div>

      {/* Add item */}
      <form onSubmit={addItem} className="bg-white border border-[#E7E5E4] rounded-sm p-5 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">{logged ? 'Add item found on the trip' : 'Add planned item'}</h3>
        <div className="grid md:grid-cols-12 gap-2 items-center">
          <Input className="md:col-span-4 rounded-sm" placeholder="Item description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
          <Input className="md:col-span-2 rounded-sm" type="number" placeholder="Planned cost" value={newItem.planned_cost} onChange={e => setNewItem({ ...newItem, planned_cost: e.target.value })} />
          <Select value={newItem.order_id} onValueChange={v => setNewItem({ ...newItem, order_id: v })}>
            <SelectTrigger className="md:col-span-2 rounded-sm h-9"><SelectValue placeholder="For order (opt.)" /></SelectTrigger>
            <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.garment_design?.slice(0, 30) || 'Order'}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={newItem.supplier_id} onValueChange={v => setNewItem({ ...newItem, supplier_id: v === 'none' ? '' : v })}>
            <SelectTrigger className="md:col-span-2 rounded-sm h-9"><SelectValue placeholder="Supplier (opt.)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No supplier</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={saving} className="md:col-span-2 bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        <div className="mt-3 pt-3 border-t border-[#E7E5E4]">
          <EntrySourceFields value={newItem} onChange={patch => setNewItem(prev => ({ ...prev, ...patch }))} />
        </div>
      </form>

      {/* Items */}
      <div className="bg-white border border-[#E7E5E4] rounded-sm">
        <div className="px-5 py-3 border-b border-[#E7E5E4]">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Trip Items</h3>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-stone-400 p-5">No items yet — add what you plan to buy before the trip.</p>
        ) : (
          <div>
            {items.map(it => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center py-3 px-4 border-b border-[#E7E5E4] last:border-b-0">
                <div className="col-span-12 md:col-span-4 min-w-0">
                  <p className="text-sm font-medium text-[#1C1917] truncate">{it.description}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {it.planned_before ? 'Planned before trip' : 'Added on the go'}
                    {it.order_id && orderById[it.order_id] && (
                     <> · <Link to={`/orders/${it.order_id}`} className="text-[#800020] hover:underline">{orderById[it.order_id].garment_design?.slice(0, 24) || 'Order'}</Link></>
                    )}
                    {it.supplier_id && supMap[it.supplier_id] && <> · from {supMap[it.supplier_id].name}</>}
                  </p>
                </div>
                <div className="col-span-4 md:col-span-2 text-sm text-stone-500">Planned: {formatCurrency(it.planned_cost)}</div>
                {logged ? (
                  <>
                    <div className="col-span-4 md:col-span-3">
                      <Label className="text-[10px] text-stone-400">Obtained?</Label>
                      <Select value={it.obtained ? 'Yes' : 'No'} onValueChange={v => setObtained(it, v === 'Yes')}>
                        <SelectTrigger className="rounded-sm h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes — obtained</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Label className="text-[10px] text-stone-400">Actual cost</Label>
                      <Input type="number" className="rounded-sm h-8" defaultValue={it.actual_cost ?? ''} onBlur={e => saveActual(it, e.target.value)} />
                    </div>
                  </>
                ) : (
                  <div className="col-span-8 md:col-span-5 text-xs text-stone-300 italic self-center">Record the outcome after the trip</div>
                )}
                <button type="button" onClick={() => removeItem(it.id)} className="col-span-1 text-stone-300 hover:text-[#800020] flex justify-end self-center"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!logged && items.length > 0 && (
        <p className="text-xs text-stone-400 mt-3 italic">Planned items can't be marked obtained yet — mark the trip as logged once you're back from Accra.</p>
      )}
    </div>
  );
}