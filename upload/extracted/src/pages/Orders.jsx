import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, FileDown } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { fetchOrders, fetchCustomers, fetchUsers, fetchPayments, customerMap, userMap, orderPaidTotal } from '@/lib/data';
import { formatCurrency, formatDate, ORDER_STATUSES } from '@/lib/format';
import { generateOrderPdf } from '@/lib/orderPdf';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

export default function Orders() {
  const { isStaff, user } = useRole();
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkStaff, setBulkStaff] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchCustomers(), fetchUsers(), fetchPayments()])
      .then(([orders, customers, users, payments]) => ({ orders, customers, users, payments }))
      .then(setData);
  }, []);

  const m = useMemo(() => {
    if (!data) return null;
    const cMap = customerMap(data.customers);
    const uMap = userMap(data.users);
    let orders = data.orders;
    if (isStaff && user) orders = orders.filter(o => o.assigned_staff_id === user.id);
    if (statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);
    if (staffFilter !== 'all') orders = orders.filter(o => o.assigned_staff_id === staffFilter);
    return orders.map(o => ({
      ...o,
      customer: cMap[o.customer_id],
      staff: uMap[o.assigned_staff_id],
      balance: (Number(o.selling_price) || 0) - orderPaidTotal(o.id, data.payments),
      payments: data.payments.filter(p => p.order_id === o.id),
    }));
  }, [data, isStaff, user, statusFilter, staffFilter]);

  const staffOptions = data?.users || [];

  const toggleOne = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(prev => (m && prev.length === m.length) ? [] : (m || []).map(o => o.id));

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.length === 0) return;
    setApplying(true);
    try {
      await base44.entities.Order.bulkUpdate(selected.map(id => ({ id, status: bulkStatus })));
      setData(prev => ({ ...prev, orders: prev.orders.map(o => selected.includes(o.id) ? { ...o, status: bulkStatus } : o) }));
      setSelected([]); setBulkStatus('');
    } finally { setApplying(false); }
  };

  const applyBulkStaff = async () => {
    if (!bulkStaff || selected.length === 0) return;
    setApplying(true);
    try {
      await base44.entities.Order.bulkUpdate(selected.map(id => ({ id, assigned_staff_id: bulkStaff })));
      setData(prev => ({ ...prev, orders: prev.orders.map(o => selected.includes(o.id) ? { ...o, assigned_staff_id: bulkStaff } : o) }));
      setSelected([]); setBulkStaff('');
    } finally { setApplying(false); }
  };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917]" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>Orders</h1>
          <p className="text-sm text-stone-500 mt-1">{m ? `${m.length} orders` : 'Loading…'}</p>
        </div>
        <Link to="/orders/new"><Button className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2"><Plus className="w-4 h-4" /> New Order</Button></Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="flex items-center gap-1.5 text-xs text-stone-400"><Filter className="w-3.5 h-3.5" />Filter</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] rounded-sm h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {!isStaff && (
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-[180px] rounded-sm h-9 text-sm"><SelectValue placeholder="All staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {staffOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {!isStaff && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-[#800020]/5 border border-[#800020]/20 rounded-sm">
          <span className="text-sm font-medium text-[#800020]">{selected.length} selected</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[180px] rounded-sm h-9 text-sm bg-white"><SelectValue placeholder="Set status…" /></SelectTrigger>
            <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" disabled={!bulkStatus || applying} onClick={applyBulkStatus} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">Apply Status</Button>
          <Select value={bulkStaff} onValueChange={setBulkStaff}>
            <SelectTrigger className="w-[180px] rounded-sm h-9 text-sm bg-white"><SelectValue placeholder="Assign staff…" /></SelectTrigger>
            <SelectContent>{staffOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" disabled={!bulkStaff || applying} onClick={applyBulkStaff} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">Apply Staff</Button>
          <Button size="sm" variant="outline" onClick={() => setSelected([])} className="rounded-sm">Clear</Button>
        </div>
      )}

      {!m ? <p className="text-sm text-stone-400">Loading…</p> : m.length === 0 ? (
        <p className="text-sm text-stone-400 py-10 text-center">No orders match these filters.</p>
      ) : (
        <div className="border border-[#E7E5E4] rounded-sm bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E7E5E4] text-left text-[11px] uppercase tracking-wide text-stone-400">
                {!isStaff && <th className="px-5 py-3 font-medium w-10"><Checkbox checked={selected.length > 0 && selected.length === m.length} onCheckedChange={toggleAll} /></th>}
                <th className="px-5 py-3 font-medium">Garment</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Delivery</th>
                <th className="px-5 py-3 font-medium">Staff</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {!isStaff && <th className="px-5 py-3 font-medium text-right">Balance</th>}
                {!isStaff && <th className="px-5 py-3 font-medium text-right">Invoice</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5E4]">
              {m.map(o => (
                <tr key={o.id} className="hover:bg-[#FBF9F7] transition">
                  {!isStaff && <td className="px-5 py-3.5"><Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggleOne(o.id)} /></td>}
                  <td className="px-5 py-3.5"><Link to={`/orders/${o.id}`} className="font-medium text-[#1C1917] hover:text-[#800020] block max-w-[220px] truncate">{o.garment_design || 'Untitled garment'}</Link></td>
                  <td className="px-5 py-3.5 text-stone-600">{o.customer?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-stone-600">{formatDate(o.delivery_date)}</td>
                  <td className="px-5 py-3.5 text-stone-600">{o.staff?.full_name || o.staff?.email || '—'}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                  {!isStaff && <td className="px-5 py-3.5 text-right font-medium text-[#1C1917]">{o.balance > 0 ? formatCurrency(o.balance) : <span className="text-[#15803D]">Settled</span>}</td>}
                  {!isStaff && (
                    <td className="px-5 py-3.5 text-right">
                      {o.status === 'Completed' && (
                        <Button variant="outline" size="sm" className="gap-1.5 rounded-sm" onClick={() => generateOrderPdf({ order: o, customer: o.customer, payments: o.payments, fittings: [] })}>
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}