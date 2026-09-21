import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

export default function FittingsTab({ fittings, orderMap }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Fittings & Alterations</h3></div>
      <div className="p-5">
        {fittings.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No fittings recorded.</p> : (
          <div className="divide-y divide-[#E7E5E4]">
            {fittings.map(f => (
              <div key={f.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#1C1917]">{formatDate(f.date)}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {orderMap[f.order_id] ? <Link to={`/orders/${f.order_id}`} className="hover:text-[#800020]">{orderMap[f.order_id].garment_design || 'View order'}</Link> : 'Order'}
                  </p>
                  {f.outcome_notes && <p className="text-xs text-stone-500 mt-1">{f.outcome_notes}</p>}
                </div>
                <StatusBadge status={f.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}