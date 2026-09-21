import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function DelegationTool({ orders, users, onChange }) {
  const [orderId, setOrderId] = useState('');
  const [orderStaff, setOrderStaff] = useState('');
  const [deadline, setDeadline] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStaff, setTaskStaff] = useState('');
  const [taskDue, setTaskDue] = useState(todayISO());
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskOrderId, setTaskOrderId] = useState('');
  const [saving, setSaving] = useState(false);

  const pickOrder = (id) => {
    setOrderId(id);
    const o = orders.find(x => x.id === id);
    setDeadline(o?.delivery_date || '');
  };

  const notify = (staffId, kind, detail) => {
    if (!staffId) return;
    base44.functions.invoke('notifyStaff', { kind, user_id: staffId, detail }).catch(() => {});
  };

  const assignOrder = async (e) => {
    e.preventDefault();
    if (!orderId || !orderStaff) return;
    setSaving(true);
    try {
      const order = orders.find(x => x.id === orderId);
      await base44.entities.Order.update(orderId, { assigned_staff_id: orderStaff, delivery_date: deadline || order?.delivery_date });
      notify(orderStaff, 'order_assigned', `Order: ${order?.garment_design || 'View order'}${deadline ? `\nDeadline: ${deadline}` : ''}`);
      setOrderId(''); setOrderStaff(''); setDeadline('');
      onChange();
    } finally { setSaving(false); }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!taskTitle || !taskStaff) return;
    setSaving(true);
    try {
      await base44.entities.Task.create({
        title: taskTitle, staff_id: taskStaff, due_date: taskDue, priority: taskPriority,
        status: 'To Do', order_id: taskOrderId || undefined,
      });
      const linkedOrder = orders.find(x => x.id === taskOrderId);
      notify(taskStaff, 'task_assigned', `Task: ${taskTitle}${linkedOrder ? `\nOrder: ${linkedOrder.garment_design || ''}` : ''}\nDue: ${taskDue}`);
      setTaskTitle(''); setTaskStaff(''); setTaskDue(todayISO()); setTaskPriority('Medium'); setTaskOrderId('');
      onChange();
    } finally { setSaving(false); }
  };

  return (
    <AtelierCard title="Delegate Work">
      <Tabs defaultValue="order">
        <TabsList className="w-full">
          <TabsTrigger value="order" className="flex-1 text-xs">Assign Order</TabsTrigger>
          <TabsTrigger value="task" className="flex-1 text-xs">New Task</TabsTrigger>
        </TabsList>

        <TabsContent value="order" className="mt-3">
          <form onSubmit={assignOrder} className="space-y-3">
            <div><Label>Order</Label>
              <Select value={orderId} onValueChange={pickOrder}>
                <SelectTrigger className="rounded-sm"><SelectValue placeholder="Choose an order…" /></SelectTrigger>
                <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.garment_design?.slice(0, 45) || 'Untitled garment'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Staff Member</Label>
                <Select value={orderStaff} onValueChange={setOrderStaff}>
                  <SelectTrigger className="rounded-sm"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Deadline</Label><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
            </div>
            <Button type="submit" disabled={saving || !orderId || !orderStaff} className="bg-[#800020] hover:bg-[#6b0018] text-white w-full">{saving ? 'Assigning…' : 'Assign Order'}</Button>
          </form>
        </TabsContent>

        <TabsContent value="task" className="mt-3">
          <form onSubmit={createTask} className="space-y-3">
            <div><Label>Task</Label><Input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Bead the bodice" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Staff Member</Label>
                <Select value={taskStaff} onValueChange={setTaskStaff}>
                  <SelectTrigger className="rounded-sm"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Deadline</Label><Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Low', 'Medium', 'High'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Linked Order (optional)</Label>
                <Select value={taskOrderId} onValueChange={setTaskOrderId}>
                  <SelectTrigger className="rounded-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.garment_design?.slice(0, 35) || 'Untitled'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={saving || !taskTitle || !taskStaff} className="bg-[#800020] hover:bg-[#6b0018] text-white w-full">{saving ? 'Assigning…' : 'Create & Assign Task'}</Button>
          </form>
        </TabsContent>
      </Tabs>
    </AtelierCard>
  );
}