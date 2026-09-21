import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronRight, Image as ImageIcon, User, Calendar, ClipboardList, FileText } from 'lucide-react';
import { generateOrderPdf } from '@/lib/orderPdf';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { fetchUsers, userMap } from '@/lib/data';
import { fetchSettings } from '@/lib/costing';
import { formatCurrency, formatDate, todayISO, ORDER_STATUSES } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import StatusStepper from '@/components/StatusStepper';
import OrderJourney from '@/components/OrderJourney';
import OrderFeedbackPanel from '@/components/order/OrderFeedbackPanel';
import EntrySourceFields, { entryFields } from '@/components/EntrySourceFields';
import { Image as Img } from '@/components/ui/image';
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

export default function OrderDetail() {
  const { id } = useParams();
  const { isStaff, user } = useRole();
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [measurement, setMeasurement] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [labour, setLabour] = useState([]);
  const [costs, setCosts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fittings, setFittings] = useState([]);
  const [checks, setChecks] = useState([]);
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [fitOpen, setFitOpen] = useState(false);
  const [pay, setPay] = useState({ amount: '', date: todayISO(), type: 'Instalment', method: 'Cash', entry_log: 'Self-Entered', logged_by: '', assisted_call_id: '' });
  const [fit, setFit] = useState({ date: todayISO(), status: 'Scheduled', outcome_notes: '' });
  const [task, setTask] = useState({ title: '', staff_id: '', due_date: todayISO(), priority: 'Medium' });
  const [qcOpen, setQcOpen] = useState(false);
  const [qc, setQc] = useState({ stage: 'Cutting', inspector_id: '', date: todayISO(), result: 'Pass', notes: '' });
  const [qualityBlock, setQualityBlock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  const load = () => {
    base44.entities.Order.get(id).then(async o => {
      setOrder(o);
      if (o.customer_id) base44.entities.Customer.get(o.customer_id).then(setCustomer).catch(() => {});
      if (o.measurement_id) base44.entities.Measurement.get(o.measurement_id).then(setMeasurement).catch(() => {});
    }).catch(() => setOrder(null));
    base44.entities.OrderMaterial.filter({ order_id: id }, '-created_date', 200).then(setMaterials);
    base44.entities.OrderLabour.filter({ order_id: id }, '-created_date', 200).then(setLabour);
    base44.entities.OrderAdditionalCost.filter({ order_id: id }, '-created_date', 200).then(setCosts);
    base44.entities.Payment.filter({ order_id: id }, '-date', 200).then(setPayments);
    base44.entities.Fitting.filter({ order_id: id }, '-date', 200).then(setFittings);
    base44.entities.QualityCheck.filter({ order_id: id }, '-date', 200).then(setChecks);
    base44.entities.OrderStatusHistory.filter({ order_id: id }, 'date', 200).then(setHistory);
    fetchUsers().then(setUsers);
    base44.entities.Supplier.list('-created_date', 200).then(setSuppliers).catch(() => {});
    fetchSettings().then(setSettings).catch(() => {});
  };
  useEffect(load, [id]);

  const uMap = useMemo(() => userMap(users), [users]);
  const sMap = useMemo(() => Object.fromEntries(suppliers.map(s => [s.id, s])), [suppliers]);

  const totals = useMemo(() => {
    const overhead = Number(settings?.overhead_amount) || 0;
    const cost = materials.reduce((s, m) => s + (Number(m.total_cost) || 0), 0)
      + labour.reduce((s, l) => s + (Number(l.cost) || 0), 0)
      + costs.reduce((s, c) => s + (Number(c.amount) || 0), 0)
      + overhead;
    const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const selling = Number(order?.selling_price) || 0;
    return { cost, paid, selling, balance: selling - paid, profit: selling - cost, overhead };
  }, [materials, labour, costs, payments, order, settings]);

  // Order Journey: one chronological timeline of statuses, payments, fittings and quality checks
  const journey = useMemo(() => {
    const events = [];
    history.forEach(h => events.push({ key: h.id, kind: 'status', date: h.date, title: `Moved to ${h.status}`, who: uMap[h.changed_by]?.full_name || uMap[h.changed_by]?.email || '', notes: h.notes }));
    if (!isStaff) payments.forEach(p => events.push({ key: `p-${p.id}`, kind: 'payment', date: p.date, title: `${formatCurrency(p.amount)} ${p.type.toLowerCase()} received (${p.method})`, who: '', notes: '' }));
    fittings.forEach(ft => events.push({ key: `f-${ft.id}`, kind: 'fitting', date: ft.date, title: `Fitting · ${ft.status}`, who: '', notes: ft.outcome_notes }));
    checks.forEach(c => events.push({ key: `q-${c.id}`, kind: 'quality', date: c.date, title: `${c.stage} check · ${c.result}`, who: uMap[c.inspector_id]?.full_name || uMap[c.inspector_id]?.email || '', notes: c.notes }));
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [history, payments, fittings, checks, uMap, isStaff]);

  const canEdit = !isStaff || (order && user && order.assigned_staff_id === user.id);

  const advance = async () => {
    const idx = ORDER_STATUSES.indexOf(order.status);
    if (idx < ORDER_STATUSES.length - 1) {
      const next = ORDER_STATUSES[idx + 1];
      if (next === 'Ready' && !checks.some(c => c.stage === 'Final' && c.result === 'Pass')) {
        setQualityBlock(true);
        return;
      }
      const updated = await base44.entities.Order.update(order.id, { status: next });
      base44.entities.OrderStatusHistory.create({ order_id: order.id, status: next, date: todayISO(), changed_by: user?.id }).catch(() => {});
      if (['In Production', 'Fitting'].includes(next) && order.assigned_staff_id) {
        base44.functions.invoke('notifyStaff', {
          kind: 'status_update',
          user_id: order.assigned_staff_id,
          detail: `Order: ${order.garment_design || 'View order'}${customer ? `\nCustomer: ${customer.name}` : ''}\nNew status: ${next}`,
        }).catch(() => {});
      }
      setOrder(updated);
      setQualityBlock(false);
    }
  };

  const addCheck = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.QualityCheck.create({
        order_id: id,
        stage: qc.stage,
        inspector_id: qc.inspector_id || undefined,
        date: qc.date,
        result: qc.result,
        notes: qc.notes,
      });
      setQc({ stage: 'Cutting', inspector_id: '', date: todayISO(), result: 'Pass', notes: '' });
      setQcOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Payment.create({ order_id: id, amount: Number(pay.amount) || 0, date: pay.date, type: pay.type, method: pay.method, ...entryFields(pay) });
      setPay({ amount: '', date: todayISO(), type: 'Instalment', method: 'Cash', entry_log: 'Self-Entered', logged_by: '', assisted_call_id: '' });
      setPayOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const addFitting = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Fitting.create({ order_id: id, date: fit.date, status: fit.status, outcome_notes: fit.outcome_notes });
      setFit({ date: todayISO(), status: 'Scheduled', outcome_notes: '' });
      setFitOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const assignTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Task.create({
        title: task.title,
        staff_id: task.staff_id,
        due_date: task.due_date,
        priority: task.priority,
        status: 'To Do',
        order_id: id,
      });
      if (task.staff_id && task.staff_id !== user?.id) {
        base44.functions.invoke('notifyStaff', {
          kind: 'task_assigned',
          user_id: task.staff_id,
          detail: `Task: ${task.title}\nOrder: ${order?.garment_design || 'View order'}${customer ? `\nCustomer: ${customer.name}` : ''}\nDue: ${task.due_date}`,
        }).catch(() => {});
      }
      setTask({ title: '', staff_id: '', due_date: todayISO(), priority: 'Medium' });
      setTaskOpen(false);
    } finally { setSaving(false); }
  };

  if (order === null) return <div className="p-10 text-sm text-stone-400">Loading order…</div>;
  if (!order) return <div className="p-10 text-sm text-stone-400">Order not found.</div>;

  const idx = ORDER_STATUSES.indexOf(order.status);
  const canAdvance = idx < ORDER_STATUSES.length - 1;

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-5"><ArrowLeft className="w-4 h-4" /> Orders</Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917] leading-tight" style={{ fontSize: 'clamp(26px, 4vw, 36px)' }}>{order.garment_design || 'Untitled garment'}</h1>
          {customer && <Link to={`/customers/${customer.id}`} className="text-sm text-stone-500 hover:text-[#800020] mt-1 inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{customer.name}</Link>}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {!isStaff && (
            <Button variant="outline" className="rounded-sm gap-1.5 text-sm" onClick={() => generateOrderPdf({ order, customer, payments, fittings })}>
              <FileText className="w-4 h-4" /> Client PDF
            </Button>
          )}
          {!isStaff && (
            <Button variant="outline" className="rounded-sm gap-1.5 text-sm" onClick={() => setTaskOpen(true)}>
              <ClipboardList className="w-4 h-4" /> Assign Task
            </Button>
          )}
          {canEdit && canAdvance && <Button onClick={advance} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5 text-sm">Advance <ChevronRight className="w-4 h-4" /></Button>}
        </div>
      </div>

      {qualityBlock && (
        <p className="mb-5 text-sm text-[#800020] bg-[#800020]/5 border border-[#800020]/20 rounded-sm px-4 py-3">
          This order can't move to Ready until it passes a Final quality check — log one in the Quality Checks section below.
        </p>
      )}

      {/* Assign Task dialog (Madam only) */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader><DialogTitle className="font-display text-2xl">Assign Task</DialogTitle></DialogHeader>
          <form onSubmit={assignTask} className="space-y-3">
            <div><Label>Task</Label><Input required value={task.title} onChange={e => setTask({ ...task, title: e.target.value })} placeholder="e.g. Bead the bodice" /></div>
            <div><Label>Staff Member</Label>
              <Select value={task.staff_id} onValueChange={v => setTask({ ...task, staff_id: v })}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input type="date" value={task.due_date} onChange={e => setTask({ ...task, due_date: e.target.value })} /></div>
              <div><Label>Priority</Label>
                <Select value={task.priority} onValueChange={v => setTask({ ...task, priority: v })}>
                  <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Low', 'Medium', 'High'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Assign Task'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stepper */}
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5 mb-5 overflow-x-auto">
        <StatusStepper current={order.status} />
      </div>

      {/* Money summary (Madam only) */}
      {!isStaff && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">True Cost</span>
          <div className="font-display font-semibold text-[#1C1917] mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{formatCurrency(totals.cost)}</div>
          {totals.overhead > 0 && <p className="text-[10px] text-stone-400 mt-1">incl. {formatCurrency(totals.overhead)} overhead</p>}
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Selling Price</span>
          <div className="font-display font-semibold text-[#1C1917] mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{formatCurrency(totals.selling)}</div>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Paid So Far</span>
          <div className="font-display font-semibold text-[#15803D] mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>{formatCurrency(totals.paid)}</div>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Outstanding</span>
          <div className="font-display font-semibold mt-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)', color: totals.balance > 0 ? '#800020' : '#15803D' }}>{formatCurrency(totals.balance)}</div>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 space-y-4 md:space-y-5">
          {order.design_image && (
            <div className="bg-white border border-[#E7E5E4] rounded-sm p-3">
              <Img src={order.design_image} alt="Design" className="w-full max-h-72 object-cover rounded-sm" fittingType="fit" />
            </div>
          )}

          {/* Materials */}
          <div className="bg-white border border-[#E7E5E4] rounded-sm">
            <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Materials</h3></div>
            <div className="p-5">
              {materials.length === 0 ? <p className="text-sm text-stone-400">None recorded.</p> : (
                <table className="w-full text-sm"><tbody className="divide-y divide-[#E7E5E4]">
                  {materials.map(m => (
                    <tr key={m.id}><td className="py-2.5 text-[#1C1917]">{m.item_name}{m.supplier_id && sMap[m.supplier_id] && <span className="block text-[11px] text-stone-400">from {sMap[m.supplier_id].name}</span>}</td>{!isStaff && <td className="py-2.5 text-stone-500 text-right">{m.quantity} × {formatCurrency(m.unit_cost)}</td>}{!isStaff && <td className="py-2.5 text-right font-medium w-24">{formatCurrency(m.total_cost)}</td>}</tr>
                  ))}
                </tbody></table>
              )}
            </div>
          </div>

          {/* Labour */}
          <div className="bg-white border border-[#E7E5E4] rounded-sm">
            <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Labour</h3></div>
            <div className="p-5">
              {labour.length === 0 ? <p className="text-sm text-stone-400">None recorded.</p> : (
                <table className="w-full text-sm"><tbody className="divide-y divide-[#E7E5E4]">
                  {labour.map(l => (
                    <tr key={l.id}><td className="py-2.5 text-[#1C1917]">{l.task_description}</td><td className="py-2.5 text-stone-500 text-right">{uMap[l.staff_id]?.full_name || uMap[l.staff_id]?.email || '—'}</td>{!isStaff && <td className="py-2.5 text-stone-500 text-right">{l.hours}h × {formatCurrency(l.rate)}</td>}{!isStaff && <td className="py-2.5 text-right font-medium w-24">{formatCurrency(l.cost)}</td>}</tr>
                  ))}
                </tbody></table>
              )}
            </div>
          </div>

          {/* Additional costs (Madam only) */}
          {costs.length > 0 && !isStaff && (
            <div className="bg-white border border-[#E7E5E4] rounded-sm">
              <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Additional Costs</h3></div>
              <div className="p-5">
                <table className="w-full text-sm"><tbody className="divide-y divide-[#E7E5E4]">
                  {costs.map(c => <tr key={c.id}><td className="py-2.5 text-[#1C1917]">{c.description}</td><td className="py-2.5 text-right font-medium w-24">{formatCurrency(c.amount)}</td></tr>)}
                </tbody></table>
              </div>
            </div>
          )}

          {/* Fittings */}
          <div className="bg-white border border-[#E7E5E4] rounded-sm">
            <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Fittings</h3>
              {canEdit && (
                <Dialog open={fitOpen} onOpenChange={setFitOpen}>
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 rounded-sm"><Plus className="w-3.5 h-3.5" /> Add</Button></DialogTrigger>
                  <DialogContent className="rounded-sm">
                    <DialogHeader><DialogTitle className="font-display text-2xl">Schedule Fitting</DialogTitle></DialogHeader>
                    <form onSubmit={addFitting} className="space-y-3">
                      <div><Label>Date</Label><Input type="date" required value={fit.date} onChange={e => setFit({ ...fit, date: e.target.value })} /></div>
                      <div><Label>Status</Label>
                        <Select value={fit.status} onValueChange={v => setFit({ ...fit, status: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{['Scheduled', 'Completed', 'Alterations Needed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div><Label>Outcome Notes</Label><Textarea value={fit.outcome_notes} onChange={e => setFit({ ...fit, outcome_notes: e.target.value })} /></div>
                      <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save'}</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="p-5">
              {fittings.length === 0 ? <p className="text-sm text-stone-400">No fittings scheduled.</p> : (
                <div className="divide-y divide-[#E7E5E4]">
                  {fittings.map(ft => (
                    <div key={ft.id} className="py-3 flex items-start justify-between gap-3">
                      <div><p className="text-sm font-medium text-[#1C1917]">{formatDate(ft.date)}</p>{ft.outcome_notes && <p className="text-xs text-stone-500 mt-1">{ft.outcome_notes}</p>}</div>
                      <StatusBadge status={ft.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quality Checks */}
          <div className="bg-white border border-[#E7E5E4] rounded-sm">
            <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Quality Checks</h3>
              {canEdit && (
                <Dialog open={qcOpen} onOpenChange={setQcOpen}>
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 rounded-sm"><Plus className="w-3.5 h-3.5" /> Add</Button></DialogTrigger>
                  <DialogContent className="rounded-sm">
                    <DialogHeader><DialogTitle className="font-display text-2xl">Log Quality Check</DialogTitle></DialogHeader>
                    <form onSubmit={addCheck} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Stage</Label>
                          <Select value={qc.stage} onValueChange={v => setQc({ ...qc, stage: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{['Cutting', 'Sewing', 'Finishing', 'Final'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div><Label>Result</Label>
                          <Select value={qc.result} onValueChange={v => setQc({ ...qc, result: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{['Pass', 'Needs Rework'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Date</Label><Input type="date" required value={qc.date} onChange={e => setQc({ ...qc, date: e.target.value })} /></div>
                        <div><Label>Inspector</Label>
                          <Select value={qc.inspector_id} onValueChange={v => setQc({ ...qc, inspector_id: v })}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Staff member" /></SelectTrigger>
                            <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent></Select>
                        </div>
                      </div>
                      <div><Label>Notes</Label><Textarea value={qc.notes} onChange={e => setQc({ ...qc, notes: e.target.value })} placeholder="Describe any issue found" /></div>
                      <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save Check'}</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="p-5">
              {checks.length === 0 ? <p className="text-sm text-stone-400">No quality checks logged yet.</p> : (
                <div className="divide-y divide-[#E7E5E4]">
                  {checks.map(c => (
                    <div key={c.id} className="py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#1C1917]">{c.stage} · {formatDate(c.date)}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{c.inspector_id ? (uMap[c.inspector_id]?.full_name || uMap[c.inspector_id]?.email) : 'No inspector recorded'}</p>
                        {c.notes && <p className="text-xs text-stone-500 mt-1.5">{c.notes}</p>}
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${c.result === 'Pass' ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#800020]/10 text-[#800020]'}`}>{c.result}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Handover & Feedback */}
          <OrderFeedbackPanel order={order} customerName={customer?.name} users={users} currentUser={user} isStaff={isStaff} />

          {/* Order Journey */}
          <OrderJourney events={journey} />
        </div>

        {/* Right column */}
        <div className="space-y-4 md:space-y-5">
          <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Details</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-stone-400">Order Date</dt><dd className="text-[#1C1917]">{formatDate(order.order_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-400">Delivery Date</dt><dd className="text-[#1C1917]">{formatDate(order.delivery_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-400">Assigned Staff</dt><dd className="text-[#1C1917]">{uMap[order.assigned_staff_id]?.full_name || uMap[order.assigned_staff_id]?.email || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-stone-400">Measurement</dt><dd className="text-[#1C1917]">{measurement ? formatDate(measurement.date_taken) : '—'}</dd></div>
              {!isStaff && <div className="flex justify-between pt-2 border-t border-[#E7E5E4]"><dt className="text-stone-400">Margin (Selling − True Cost)</dt><dd className="font-medium" style={{ color: totals.profit >= 0 ? '#15803D' : '#800020' }}>{formatCurrency(totals.profit)}</dd></div>}
            </dl>
          </div>

          {/* Payments (Madam only) */}
          {!isStaff && (
          <div className="bg-white border border-[#E7E5E4] rounded-sm">
            <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Payments</h3>
              {canEdit && (
                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 rounded-sm"><Plus className="w-3.5 h-3.5" /> Add</Button></DialogTrigger>
                  <DialogContent className="rounded-sm">
                    <DialogHeader><DialogTitle className="font-display text-2xl">Record Payment</DialogTitle></DialogHeader>
                    <form onSubmit={addPayment} className="space-y-3">
                      <div><Label>Amount</Label><Input type="number" required value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} /></div>
                      <div><Label>Date</Label><Input type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Type</Label>
                          <Select value={pay.type} onValueChange={v => setPay({ ...pay, type: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{['Deposit', 'Instalment', 'Final'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div><Label>Method</Label>
                          <Select value={pay.method} onValueChange={v => setPay({ ...pay, method: v })}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{['Cash', 'Mobile Money', 'Bank'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                        </div>
                      </div>
                      <EntrySourceFields value={pay} onChange={patch => setPay(p => ({ ...p, ...patch }))} />
                      <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Record Payment'}</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="p-5">
              {payments.length === 0 ? <p className="text-sm text-stone-400">No payments recorded.</p> : (
                <div className="divide-y divide-[#E7E5E4]">
                  {payments.map(p => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div><p className="text-sm font-medium text-[#1C1917]">{formatCurrency(p.amount)}</p><p className="text-xs text-stone-400">{formatDate(p.date)} · {p.type} · {p.method}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {order.notes && (
            <div className="bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Notes</h3>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}