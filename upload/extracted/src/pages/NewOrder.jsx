import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Upload } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { fetchCustomers, fetchUsers, fetchMeasurements } from '@/lib/data';
import { fetchSettings } from '@/lib/costing';
import EntrySourceFields, { entryFields } from '@/components/EntrySourceFields';
import { todayISO, ORDER_STATUSES } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

const emptyMaterial = { item_name: '', quantity: '', unit_cost: '', supplier_id: '' };
const emptyLabour = { task_description: '', staff_id: '', hours: '', rate: '' };
const emptyCost = { description: '', amount: '' };
const emptyPayment = { amount: '', date: todayISO(), type: 'Deposit', method: 'Cash' };
const emptyFitting = { date: todayISO(), status: 'Scheduled', outcome_notes: '' };

function Section({ n, title, children, action }) {
  return (
    <div className="border border-[#E7E5E4] rounded-sm bg-white">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E5E4]">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-[#800020] text-white text-xs font-semibold flex items-center justify-center">{n}</span>
          <h3 className="text-sm font-semibold text-[#1C1917]">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { isStaff, user } = useRole();
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [overhead, setOverhead] = useState(0);

  const [f, setF] = useState({
    customer_id: '', garment_design: '', order_date: todayISO(), delivery_date: '',
    measurement_id: '', status: 'Enquiry', assigned_staff_id: '', selling_price: '', notes: '',
    entry_log: 'Self-Entered', logged_by: '', assisted_call_id: '',
  });
  const [materials, setMaterials] = useState([]);
  const [labour, setLabour] = useState([]);
  const [costs, setCosts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fittings, setFittings] = useState([]);

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchUsers(), fetchMeasurements(), base44.entities.Supplier.list('-created_date', 200).catch(() => []), fetchSettings().catch(() => null)]).then(([c, u, mm, sup, s]) => {
      setCustomers(c); setUsers(u); setMeasurements(mm); setSuppliers(sup);
      setOverhead(Number(s?.overhead_amount) || 0);
      if (isStaff && user) setF(prev => ({ ...prev, assigned_staff_id: user.id }));
      const params = new URLSearchParams(window.location.search);
      const preselectCustomer = params.get('customer');
      const preselectGarment = params.get('garment');
      if (preselectCustomer || preselectGarment) setF(prev => ({ ...prev, ...(preselectCustomer ? { customer_id: preselectCustomer } : {}), ...(preselectGarment ? { garment_design: preselectGarment } : {}) }));
    });
  }, []);

  const staffUsers = users;
  const customerMeasurements = measurements.filter(m => m.customer_id === f.customer_id);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const costTotal = useMemo(() => {
    const m = materials.reduce((s, x) => s + ((Number(x.quantity) || 0) * (Number(x.unit_cost) || 0)), 0);
    const l = labour.reduce((s, x) => s + ((Number(x.hours) || 0) * (Number(x.rate) || 0)), 0);
    const a = costs.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    return m + l + a + overhead;
  }, [materials, labour, costs, overhead]);

  const updateRow = (setter, i, patch) => setter(arr => arr.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.customer_id) return;
    setSaving(true);
    try {
      let design_image = '';
      if (imageFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        design_image = file_url;
      }
      const order = await base44.entities.Order.create({
        customer_id: f.customer_id,
        garment_design: f.garment_design,
        design_image,
        order_date: f.order_date,
        delivery_date: f.delivery_date,
        measurement_id: f.measurement_id,
        status: f.status,
        assigned_staff_id: f.assigned_staff_id,
        selling_price: Number(f.selling_price) || 0,
        notes: f.notes,
        ...entryFields(f),
      });

      const creates = [];
      if (materials.filter(m => m.item_name).length)
        creates.push(base44.entities.OrderMaterial.bulkCreate(materials.filter(m => m.item_name).map(m => ({ order_id: order.id, item_name: m.item_name, supplier_id: m.supplier_id || undefined, quantity: Number(m.quantity) || 0, unit_cost: Number(m.unit_cost) || 0, total_cost: (Number(m.quantity) || 0) * (Number(m.unit_cost) || 0), ...entryFields(f) }))));
      if (labour.filter(l => l.task_description).length)
        creates.push(base44.entities.OrderLabour.bulkCreate(labour.filter(l => l.task_description).map(l => ({ order_id: order.id, task_description: l.task_description, staff_id: l.staff_id, hours: Number(l.hours) || 0, rate: Number(l.rate) || 0, cost: (Number(l.hours) || 0) * (Number(l.rate) || 0), ...entryFields(f) }))));
      if (costs.filter(c => c.description).length)
        creates.push(base44.entities.OrderAdditionalCost.bulkCreate(costs.filter(c => c.description).map(c => ({ order_id: order.id, description: c.description, amount: Number(c.amount) || 0 }))));
      if (payments.filter(p => p.amount).length)
        creates.push(base44.entities.Payment.bulkCreate(payments.filter(p => p.amount).map(p => ({ order_id: order.id, amount: Number(p.amount) || 0, date: p.date, type: p.type, method: p.method, ...entryFields(f) }))));
      if (fittings.filter(ft => ft.date).length)
        creates.push(base44.entities.Fitting.bulkCreate(fittings.filter(ft => ft.date).map(ft => ({ order_id: order.id, date: ft.date, status: ft.status, outcome_notes: ft.outcome_notes }))));
      creates.push(base44.entities.OrderStatusHistory.create({ order_id: order.id, status: f.status, date: f.order_date || todayISO(), changed_by: user?.id }));
      await Promise.all(creates);
      if (f.assigned_staff_id && f.assigned_staff_id !== user?.id) {
        const cust = customers.find(c => c.id === f.customer_id);
        base44.functions.invoke('notifyStaff', {
          kind: 'order_assigned',
          user_id: f.assigned_staff_id,
          detail: `Order: ${f.garment_design || 'New order'}${cust ? `\nCustomer: ${cust.name}` : ''}${f.delivery_date ? `\nDelivery date: ${f.delivery_date}` : ''}`,
        }).catch(() => {});
      }
      navigate(`/orders/${order.id}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020] mb-5"><ArrowLeft className="w-4 h-4" /> Orders</Link>
      <h1 className="font-display font-semibold text-[#1C1917] mb-1" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>New Custom Order</h1>
      <p className="text-sm text-stone-500 mb-8">Capture the full order — design, costs, payment and fittings.</p>

      <form onSubmit={submit} className="space-y-4">
        <Section n="1" title="Customer">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Customer *</Label>
              <Select value={f.customer_id} onValueChange={v => set('customer_id', v)}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Measurement Used</Label>
              <Select value={f.measurement_id} onValueChange={v => set('measurement_id', v)} disabled={!f.customer_id}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder={f.customer_id ? 'Choose measurement' : 'Select customer first'} /></SelectTrigger>
                <SelectContent>
                  {customerMeasurements.map(m => <SelectItem key={m.id} value={m.id}>{new Date(m.date_taken).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        <Section n="2" title="Garment / Design">
          <div className="space-y-4">
            <div><Label>Description</Label><Textarea rows={3} value={f.garment_design} onChange={e => set('garment_design', e.target.value)} placeholder="Describe the garment and design details…" /></div>
            <div>
              <Label>Design Image (optional)</Label>
              <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="rounded-sm" />
            </div>
          </div>
        </Section>

        <Section n="3" title="Dates">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Order Date</Label><Input type="date" value={f.order_date} onChange={e => set('order_date', e.target.value)} /></div>
            <div><Label>Delivery Date</Label><Input type="date" value={f.delivery_date} onChange={e => set('delivery_date', e.target.value)} /></div>
          </div>
        </Section>

        {/* Materials */}
        <Section n="4" title="Materials" action={<Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-sm" onClick={() => setMaterials(a => [...a, { ...emptyMaterial }])}><Plus className="w-3.5 h-3.5" /> Add</Button>}>
          {materials.length === 0 ? <p className="text-sm text-stone-400">No materials added.</p> : (
            <div className="space-y-2">
              {materials.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-3 rounded-sm" placeholder="Item name" value={row.item_name} onChange={e => updateRow(setMaterials, i, { item_name: e.target.value })} />
                  <Select value={row.supplier_id} onValueChange={v => updateRow(setMaterials, i, { supplier_id: v === 'none' ? '' : v })}>
                    <SelectTrigger className="col-span-3 rounded-sm h-9"><SelectValue placeholder="Supplier (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No supplier</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="col-span-1 rounded-sm" type="number" placeholder="Qty" value={row.quantity} onChange={e => updateRow(setMaterials, i, { quantity: e.target.value })} />
                  <Input className="col-span-2 rounded-sm" type="number" placeholder="Unit cost" value={row.unit_cost} onChange={e => updateRow(setMaterials, i, { unit_cost: e.target.value })} />
                  <div className="col-span-2 text-right text-sm text-stone-500">{formatN((Number(row.quantity) || 0) * (Number(row.unit_cost) || 0))}</div>
                  <button type="button" onClick={() => setMaterials(a => a.filter((_, idx) => idx !== i))} className="col-span-1 text-stone-400 hover:text-[#800020] flex justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Labour */}
        <Section n="5" title="Labour" action={<Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-sm" onClick={() => setLabour(a => [...a, { ...emptyLabour }])}><Plus className="w-3.5 h-3.5" /> Add</Button>}>
          {labour.length === 0 ? <p className="text-sm text-stone-400">No labour added.</p> : (
            <div className="space-y-2">
              {labour.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-4 rounded-sm" placeholder="Task" value={row.task_description} onChange={e => updateRow(setLabour, i, { task_description: e.target.value })} />
                  <Select value={row.staff_id} onValueChange={v => updateRow(setLabour, i, { staff_id: v })}>
                    <SelectTrigger className="col-span-3 rounded-sm h-9"><SelectValue placeholder="Staff" /></SelectTrigger>
                    <SelectContent>{staffUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="col-span-2 rounded-sm" type="number" placeholder="Hrs" value={row.hours} onChange={e => updateRow(setLabour, i, { hours: e.target.value })} />
                  <Input className="col-span-2 rounded-sm" type="number" placeholder="Rate" value={row.rate} onChange={e => updateRow(setLabour, i, { rate: e.target.value })} />
                  <div className="col-span-1 text-right text-sm text-stone-500">{formatN((Number(row.hours) || 0) * (Number(row.rate) || 0))}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Additional costs */}
        <Section n="6" title="Additional Costs" action={<Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-sm" onClick={() => setCosts(a => [...a, { ...emptyCost }])}><Plus className="w-3.5 h-3.5" /> Add</Button>}>
          {costs.length === 0 ? <p className="text-sm text-stone-400">No additional costs.</p> : (
            <div className="space-y-2">
              {costs.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-9 rounded-sm" placeholder="Description" value={row.description} onChange={e => updateRow(setCosts, i, { description: e.target.value })} />
                  <Input className="col-span-2 rounded-sm" type="number" placeholder="Amount" value={row.amount} onChange={e => updateRow(setCosts, i, { amount: e.target.value })} />
                  <button type="button" onClick={() => setCosts(a => a.filter((_, idx) => idx !== i))} className="col-span-1 text-stone-400 hover:text-[#800020] flex justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section n="7" title="Selling Price & Deposit">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <Label>Selling Price</Label>
              <Input type="number" value={f.selling_price} onChange={e => set('selling_price', e.target.value)} className="rounded-sm" />
            </div>
            <div className="md:col-span-2 border-l md:pl-4 border-[#E7E5E4]">
              <div className="flex items-center justify-between mb-2">
                <Label>Initial Payment</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-sm" onClick={() => setPayments(a => [...a, { ...emptyPayment }])}><Plus className="w-3.5 h-3.5" /> Add</Button>
              </div>
              {payments.length === 0 ? <p className="text-sm text-stone-400">No payment recorded.</p> : (
                <div className="space-y-2">
                  {payments.map((row, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-3 rounded-sm" type="number" placeholder="Amount" value={row.amount} onChange={e => updateRow(setPayments, i, { amount: e.target.value })} />
                      <Input className="col-span-3 rounded-sm" type="date" value={row.date} onChange={e => updateRow(setPayments, i, { date: e.target.value })} />
                      <Select value={row.type} onValueChange={v => updateRow(setPayments, i, { type: v })}>
                        <SelectTrigger className="col-span-3 rounded-sm h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Deposit', 'Instalment', 'Final'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={row.method} onValueChange={v => updateRow(setPayments, i, { method: v })}>
                        <SelectTrigger className="col-span-2 rounded-sm h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Cash', 'Mobile Money', 'Bank'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <button type="button" onClick={() => setPayments(a => a.filter((_, idx) => idx !== i))} className="col-span-1 text-stone-400 hover:text-[#800020] flex justify-center"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#E7E5E4] flex justify-between text-sm">
            <span className="text-stone-500">True cost <span className="text-stone-400">(incl. {formatN(overhead)} overhead)</span>: <span className="font-medium text-[#1C1917]">{formatN(costTotal)}</span></span>
            <span className="text-stone-500">Margin: <span className="font-medium text-[#800020]">{formatN((Number(f.selling_price) || 0) - costTotal)}</span></span>
          </div>
        </Section>

        <Section n="8" title="Production Status">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Staff</Label>
              <Select value={f.assigned_staff_id} onValueChange={v => set('assigned_staff_id', v)}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                <SelectContent>{staffUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        <Section n="9" title="Fittings" action={<Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-sm" onClick={() => setFittings(a => [...a, { ...emptyFitting }])}><Plus className="w-3.5 h-3.5" /> Add</Button>}>
          {fittings.length === 0 ? <p className="text-sm text-stone-400">No fittings scheduled.</p> : (
            <div className="space-y-2">
              {fittings.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-3 rounded-sm" type="date" value={row.date} onChange={e => updateRow(setFittings, i, { date: e.target.value })} />
                  <Select value={row.status} onValueChange={v => updateRow(setFittings, i, { status: v })}>
                    <SelectTrigger className="col-span-3 rounded-sm h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Scheduled', 'Completed', 'Alterations Needed'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="col-span-5 rounded-sm" placeholder="Outcome notes" value={row.outcome_notes} onChange={e => updateRow(setFittings, i, { outcome_notes: e.target.value })} />
                  <button type="button" onClick={() => setFittings(a => a.filter((_, idx) => idx !== i))} className="col-span-1 text-stone-400 hover:text-[#800020] flex justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section n="10" title="Notes & Entry Source">
          <div className="space-y-4">
            <Textarea rows={3} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this order…" />
            <EntrySourceFields value={f} onChange={patch => setF(prev => ({ ...prev, ...patch }))} />
          </div>
        </Section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/orders"><Button type="button" variant="outline" className="rounded-sm">Cancel</Button></Link>
          <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Create Order'}</Button>
        </div>
      </form>
    </div>
  );
}

function formatN(n) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GHS', maximumFractionDigits: 0 }).format(n || 0); }