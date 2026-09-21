import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';

export default function OrdersTab({ orders, isStaff, customerId }) {
  const active = orders.filter(o => !['Completed', 'Collected/Delivered'].includes(o.status)).length;
  const completed = orders.filter(o => o.status === 'Completed').length;

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Orders ({orders.length}) · {active} active · {completed} completed</h3>
        <Link to={`/orders/new?customer=${customerId}`}><Button size="sm" className="gap-1.5 rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white"><Plus className="w-3.5 h-3.5" /> New Order</Button></Link>
      </div>
      <div className="p-5">
        {orders.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No orders yet.</p> : (
          <div className="divide-y divide-[#E7E5E4]">
            {orders.map(o => (
              <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between py-3 group gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1917] truncate group-hover:text-[#800020]">{o.garment_design || 'Untitled garment'}</p>
                  <p className="text-xs text-stone-400 mt-0.5">Ordered {formatDate(o.order_date)} · Due {formatDate(o.delivery_date)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!isStaff && <span className="text-sm font-medium text-[#1C1917]">{formatCurrency(o.selling_price)}</span>}
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}