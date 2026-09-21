import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { shortDate, isOverdue, isWithinDays } from '@/lib/format';

const LATE_STATUSES = ['Ready', 'Collected/Delivered', 'Completed'];

export default function OrderCard({ order, customerName, staffName, feedbackCount, onFeedback }) {
  const overdue = order.delivery_date && isOverdue(order.delivery_date) && !LATE_STATUSES.includes(order.status);
  const soon = !overdue && order.delivery_date && isWithinDays(order.delivery_date, 7) && !LATE_STATUSES.includes(order.status);

  const dateChip = overdue
    ? 'text-red-600 bg-red-50 border-red-200'
    : soon
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-stone-500 bg-stone-50 border-stone-200';

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm overflow-hidden hover:border-[#800020]/40 transition">
      <Link to={`/orders/${order.id}`} className="block p-3 border-b border-[#F3F1EF]">
        <p className="text-[13px] font-medium text-[#1C1917] leading-snug line-clamp-2">{order.garment_design || 'Custom garment'}</p>
        <p className="text-[11px] text-stone-400 mt-1">{customerName}</p>
        <div className="flex items-center justify-between gap-2 mt-2.5 flex-wrap">
          <StatusBadge status={order.status} />
          {order.delivery_date && (
            <span className={`text-[10px] px-1.5 py-0.5 border rounded-sm font-medium ${dateChip}`}>
              {overdue ? '⚠ ' : ''}{shortDate(order.delivery_date)}
            </span>
          )}
        </div>
        {staffName && (
          <p className="text-[10px] text-stone-400 mt-2 border-t border-[#F3F1EF] pt-1.5">Assigned · {staffName}</p>
        )}
      </Link>
      <button
        type="button"
        onClick={onFeedback}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-stone-400 hover:text-[#800020] hover:bg-[#FBF9F7] transition"
      >
        <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Feedback</span>
        {feedbackCount > 0 && (
          <span className="px-1.5 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] text-stone-500">{feedbackCount}</span>
        )}
      </button>
    </div>
  );
}