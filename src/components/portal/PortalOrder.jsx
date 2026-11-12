import React from 'react';
import { CalendarDays } from 'lucide-react';
import StatusStepper from '@/components/StatusStepper';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';

export default function PortalOrder({ order }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="font-display text-xl font-semibold text-[#1C1917] leading-tight">{order.garment}</p>
        <StatusBadge status={order.status} />
      </div>
      {order.delivery_date && (
        <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" /> Expected ready by {formatDate(order.delivery_date)}
        </p>
      )}
      <div className="overflow-x-auto mt-4 pb-1">
        <div className="min-w-[560px]"><StatusStepper current={order.status} /></div>
      </div>
      {order.fitting && (
        <div className="mt-4 border-t border-[#F3F1EF] pt-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Latest fitting update · {formatDate(order.fitting.date)}</p>
          <p className="text-sm text-stone-600 mt-1">
            {order.fitting.notes
              || (order.fitting.status === 'Scheduled' ? "Your fitting is booked — we'll see you then." : `Fitting ${order.fitting.status.toLowerCase()}.`)}
          </p>
        </div>
      )}
    </div>
  );
}