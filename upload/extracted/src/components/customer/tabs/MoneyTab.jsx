import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/format';

function Stat({ label, value, accent }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-4">
      <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{label}</span>
      <div className="font-display font-semibold mt-1.5" style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', color: accent || '#1C1917' }}>{value}</div>
    </div>
  );
}

export default function MoneyTab({ orders, payments, orderMap }) {
  const lifetimeSpend = orders.reduce((s, o) => s + (Number(o.selling_price) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const deposits = payments.filter(p => p.type === 'Deposit').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = lifetimeSpend - totalPaid;
  const avgOrder = orders.length ? lifetimeSpend / orders.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Lifetime Spend" value={formatCurrency(lifetimeSpend)} />
        <Stat label="Total Deposits" value={formatCurrency(deposits)} />
        <Stat label="Outstanding" value={formatCurrency(outstanding)} accent={outstanding > 0 ? '#800020' : '#15803D'} />
        <Stat label="Average Order Value" value={formatCurrency(avgOrder)} />
      </div>
      <div className="bg-white border border-[#E7E5E4] rounded-sm">
        <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Payment History</h3></div>
        <div className="p-5">
          {payments.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No payments recorded. Open an order to record a payment.</p> : (
            <div className="divide-y divide-[#E7E5E4]">
              {payments.map(p => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">{formatCurrency(p.amount)} <span className="text-stone-400 font-normal">· {p.type} · {p.method}</span></p>
                    <p className="text-xs text-stone-400">{formatDate(p.date)}{orderMap[p.order_id] && <> · <Link to={`/orders/${p.order_id}`} className="hover:text-[#800020]">{orderMap[p.order_id].garment_design || 'Order'}</Link></>}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}