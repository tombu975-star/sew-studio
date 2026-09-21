import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { fetchOrders, fetchUsers, userMap, customerMap, fetchCustomers } from '@/lib/data';
import { formatDate, todayISO, shortDate, isOverdue } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import StaffInsights from '@/components/tasks/StaffInsights';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

const COLUMNS = [
  { key: 'To Do', title: 'To Do' },
  { key: 'In Progress', title: 'In Progress' },
  { key: 'Done', title: 'Done' },
];

export default function MyTasks() {
  const { isStaff, user } = useRole();
  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', staff_id: '', due_date: '', priority: 'Medium', status: 'To Do', order_id: '' });

  const load = () => {
    Promise.all([fetchOrders(), fetchUsers(), fetchCustomers()]).then(([o, u, c]) => {
      setOrders(isStaff && user ? o.filter(x => x.assigned_staff_id === user.id) : o);
      setUsers(u); setCustomers(c);
    });
    base44.entities.Task.list('-due_date', 500).then(t => {
      setTasks(isStaff && user ? t.filter(x => x.staff_id === user.id) : t);
    });
  };
  useEffect(load, [isStaff, user]);

  const uMap = useMemo(() => userMap(users), [users]);
  const cMap = useMemo(() => customerMap(customers), [customers]);
  const staffUsers = users;

  const columns = useMemo(() => COLUMNS.map(col => ({
    ...col,
    items: tasks.filter(t => t.status === col.key),
  })), [tasks]);

  const cycleStatus = async (task) => {
    const order = ['To Do', 'In Progress', 'Done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    const updated = await base44.entities.Task.update(task.id, { status: next });
    setTasks(arr => arr.map(t => t.id === task.id ? updated : t));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Task.create({
        title: form.title,
        staff_id: form.staff_id || (isStaff && user ? user.id : ''),
        due_date: form.due_date,
        priority: form.priority,
        status: form.status,
        order_id: form.order_id || undefined,
      });
      setForm({ title: '', staff_id: '', due_date: '', priority: 'Medium', status: 'To Do', order_id: '' });
      setOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const myOpenTasks = tasks.filter(t => t.status !== 'Done');

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917]" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>{isStaff ? 'My Tasks' : 'Tasks'}</h1>
          <p className="text-sm text-stone-500 mt-1">{isStaff ? `${myOpenTasks.length} open task${myOpenTasks.length !== 1 ? 's' : ''} assigned to you` : `${tasks.length} tasks across the studio`}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2"><Plus className="w-4 h-4" /> New Task</Button></DialogTrigger>
          <DialogContent className="rounded-sm">
            <DialogHeader><DialogTitle className="font-display text-2xl">New Task</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div><Label>Title</Label><Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Low', 'Medium', 'High'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{['To Do', 'In Progress', 'Done'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
                {!isStaff && <div><Label>Assign To</Label>
                  <Select value={form.staff_id} onValueChange={v => setForm({ ...form, staff_id: v })}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Staff" /></SelectTrigger>
                    <SelectContent>{staffUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent></Select>
                </div>}
              </div>
              <div><Label>Linked Order (optional)</Label>
                <Select value={form.order_id} onValueChange={v => setForm({ ...form, order_id: v })}><SelectTrigger className="rounded-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.garment_design?.slice(0, 40) || 'Untitled'}</SelectItem>)}</SelectContent></Select>
              </div>
              <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Create Task'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isStaff && <StaffInsights orders={orders} userId={user?.id} />}

      {/* Assigned orders (staff context) */}
      {isStaff && orders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Orders Assigned to You</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map(o => (
              <Link key={o.id} to={`/orders/${o.id}`} className="bg-white border border-[#E7E5E4] rounded-sm p-4 hover:border-[#800020]/40 transition group">
                <p className="text-sm font-medium text-[#1C1917] truncate group-hover:text-[#800020]">{o.garment_design || 'Untitled garment'}</p>
                <p className="text-xs text-stone-400 mt-1">{cMap[o.customer_id]?.name || '—'} · Deliver {shortDate(o.delivery_date)}</p>
                <div className="mt-3"><StatusBadge status={o.status} /></div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Task board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.key} className="bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm">
            <div className="px-4 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{col.title}</h3>
              <span className="text-xs text-stone-400">{col.items.length}</span>
            </div>
            <div className="p-3 space-y-2 min-h-[120px]">
              {col.items.length === 0 ? <p className="text-xs text-stone-400 text-center py-6">No tasks.</p> : col.items.map(t => (
                <button key={t.id} onClick={() => cycleStatus(t)} className="w-full text-left bg-white border border-[#E7E5E4] rounded-sm p-3 hover:border-[#800020]/40 transition group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#1C1917]">{t.title}</p>
                    <StatusBadge status={t.priority} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={isOverdue(t.due_date) && t.status !== 'Done' ? 'text-[#800020] font-medium' : 'text-stone-400'}>{t.due_date ? formatDate(t.due_date) : 'No due date'}</span>
                    <span className="text-stone-400 group-hover:text-[#800020] flex items-center gap-0.5">Advance <ChevronRight className="w-3 h-3" /></span>
                  </div>
                  {!isStaff && t.staff_id && <p className="text-[11px] text-stone-400 mt-1.5">{uMap[t.staff_id]?.full_name || uMap[t.staff_id]?.email}</p>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}