import React from 'react';
import { formatCurrency, formatDate } from '@/lib/format';

function Stat({ label, value, accent }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-4">
      <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <div className="font-display font-semibold mt-1.5 text-[#1C1917]" style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', color: accent }}>{value}</div>
    </div>
  );
}

export default function CustomerSnapshot({ stats, isStaff }) {
  const {
    totalOrders, activeOrders, completedOrders, cancelledOrders, lifetimeSpend, outstanding,
    totalDeposits, appointmentsCount, currentOrder, nextAppointment, avgRating,
  } = stats;

  return (
    <div className="mb-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Customer Snapshot</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Orders" value={totalOrders} />
        <Stat label="Active Orders" value={activeOrders} />
        <Stat label="Completed" value={completedOrders} />
        <Stat label="Cancelled" value={cancelledOrders} />
        {!isStaff && <Stat label="Lifetime Spend" value={formatCurrency(lifetimeSpend)} />}
        {!isStaff && <Stat label="Outstanding" value={formatCurrency(outstanding)} accent={outstanding > 0 ? '#800020' : '#15803D'} />}
        {!isStaff && <Stat label="Deposits Paid" value={formatCurrency(totalDeposits)} />}
        <Stat label="Appointments" value={appointmentsCount} />
        <Stat label="Rating" value={avgRating != null ? `${avgRating.toFixed(1)} / 5` : '—'} />
        <Stat label="Current Order" value={currentOrder || '—'} />
        <Stat label="Next Appointment" value={nextAppointment ? formatDate(nextAppointment) : '—'} />
      </div>
    </div>
  );
}