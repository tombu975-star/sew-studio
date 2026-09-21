import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchFittings, fetchOrders, fetchCustomers, customerMap } from '@/lib/data';
import { useRole } from '@/lib/roles';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import FittingDialog from '@/components/fittings/FittingDialog';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function Fittings() {
  const { isStaff } = useRole();
  const [fittingList, setFittings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const load = () => {
    Promise.all([fetchFittings(), fetchOrders(), fetchCustomers()]).then(([f, o, c]) => {
      setFittings(f); setOrders(o); setCustomers(c);
    });
  };
  useEffect(load, []);

  const cMap = useMemo(() => customerMap(customers), [customers]);
  const orderById = useMemo(() => Object.fromEntries(orders.map(o => [o.id, o])), [orders]);
  const fittingByDate = useMemo(() => {
    const map = {};
    fittingList.forEach(f => { if (f.date) (map[f.date] ||= []).push(f); });
    return map;
  }, [fittingList]);

  const today = todayISO();
  const cells = useMemo(() => {
    const startOffset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
    const start = new Date(cursor.y, cursor.m, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date: iso(d), inMonth: d.getMonth() === cursor.m, isToday: iso(d) === today };
    });
  }, [cursor, today]);

  const monthScheduled = cells.filter(c => c.inMonth).reduce((s, c) => s + (fittingByDate[c.date] || []).filter(f => f.status === 'Scheduled').length, 0);
  const upcomingCount = fittingList.filter(f => f.status === 'Scheduled' && f.date >= today).length;
  const awaitingFeedback = fittingList.filter(f => f.date && f.date < today && !f.outcome_notes);
  const shift = delta => setCursor(c => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const pendingOrders = orders.filter(o => !['Ready', 'Collected/Delivered', 'Completed'].includes(o.status));

  return (
    <div className="p-5 md:p-8 max-w-[1300px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[#1C1917]" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>Fittings Schedule</h1>
          <p className="text-sm text-stone-500 mt-1">
            {upcomingCount} fitting{upcomingCount !== 1 ? 's' : ''} upcoming · {monthScheduled} scheduled this month
            {awaitingFeedback.length > 0 && <span className="text-[#B45309]"> · {awaitingFeedback.length} awaiting outcome</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#E7E5E4] rounded-sm bg-white">
            <button onClick={() => shift(-1)} className="p-2 hover:bg-[#FBF9F7]" aria-label="Previous month"><ChevronLeft className="w-4 h-4 text-stone-500" /></button>
            <span className="px-3 text-sm font-medium text-[#1C1917] min-w-[140px] text-center">
              {new Date(cursor.y, cursor.m, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => shift(1)} className="p-2 hover:bg-[#FBF9F7]" aria-label="Next month"><ChevronRight className="w-4 h-4 text-stone-500" /></button>
          </div>
          {!isStaff && (
            <Button onClick={() => setDialogOpen(true)} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2">
              <Plus className="w-4 h-4" /> Schedule Fitting
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#E7E5E4]">
          {WEEKDAYS.map(w => (
            <div key={w} className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 text-center">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const dayFittings = fittingByDate[cell.date] || [];
            return (
              <div key={cell.date} className={`min-h-[90px] border-[#E7E5E4] border-b border-r ${i % 7 === 6 ? 'border-r-0' : ''} ${i >= 35 ? 'border-b-0' : ''} p-1.5 ${cell.inMonth ? 'bg-white' : 'bg-[#FBF9F7]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${cell.isToday ? 'bg-[#800020] text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold' : cell.inMonth ? 'text-stone-500' : 'text-stone-300'}`}>
                    {Number(cell.date.slice(-2))}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayFittings.map(f => {
                    const order = orderById[f.order_id];
                    const done = f.status !== 'Scheduled';
                    const awaiting = f.date < today && !f.outcome_notes;
                    return (
                      <Link key={f.id} to={`/orders/${f.order_id}`}
                        className={`block text-left text-[10px] leading-tight px-1.5 py-1 rounded-sm border transition ${awaiting ? 'border-[#B45309]/50 bg-[#B45309]/[0.06] text-[#1C1917] hover:border-[#B45309]' : done ? 'border-[#E7E5E4] bg-[#FBF9F7] text-stone-400' : 'border-[#800020]/25 bg-[#800020]/[0.04] text-[#1C1917] hover:border-[#800020]/50'} ${cell.inMonth ? '' : 'opacity-50'}`}>
                        <span className="flex items-start gap-1">
                          {awaiting && <AlertCircle className="w-3 h-3 shrink-0 text-[#B45309]" />}
                          {done && !awaiting && <CheckCircle2 className="w-3 h-3 shrink-0 text-[#3F6212]" />}
                          <span className={done ? 'line-through' : ''}>
                            {order?.garment_design?.slice(0, 22) || 'Fitting'}
                          </span>
                        </span>
                        {order && cMap[order.customer_id]?.name && (
                          <span className="block text-stone-400 truncate">{cMap[order.customer_id].name.split(' ')[0]}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isStaff && (
        <FittingDialog open={dialogOpen} onOpenChange={setDialogOpen} orders={pendingOrders} onSaved={load} />
      )}
    </div>
  );
}