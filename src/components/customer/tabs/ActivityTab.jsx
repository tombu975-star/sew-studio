import React, { useMemo } from 'react';
import { formatDate } from '@/lib/format';

export default function ActivityTab({ customer, orders, payments, appointments, fittings, communications, notes, gallery, measurementSets, isStaff }) {
  const events = useMemo(() => {
    const list = [];
    if (customer.created_date) list.push({ date: customer.created_date, label: 'Customer added' });
    orders.forEach(o => list.push({ date: o.order_date, label: `Order created — ${o.garment_design || 'Untitled garment'}` }));
    if (!isStaff) payments.forEach(p => list.push({ date: p.date, label: `Payment received — ${p.type}` }));
    appointments.forEach(a => list.push({ date: a.date, label: `Appointment — ${a.type} (${a.attendance})` }));
    fittings.forEach(f => list.push({ date: f.date, label: `Fitting — ${f.status}` }));
    communications.forEach(c => list.push({ date: c.date, label: `${c.type} — ${c.summary?.slice(0, 60) || ''}` }));
    notes.forEach(n => list.push({ date: n.date, label: `Note added` }));
    gallery.forEach(g => list.push({ date: g.date, label: `Gallery — ${g.title || g.category || 'Image added'}` }));
    measurementSets.forEach(m => list.push({ date: m.date_taken, label: `Measurement set — ${m.set_name}` }));
    return list.filter(e => e.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [customer, orders, payments, appointments, fittings, communications, notes, gallery, measurementSets, isStaff]);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Customer Activity Timeline</h3></div>
      <div className="p-5">
        {events.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No activity yet.</p> : (
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-stone-400 shrink-0 w-24">{formatDate(e.date)}</span>
                <span className="text-[#1C1917]">{e.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}