import React from 'react';

export default function PortalPolicies({ policy }) {
  if (!policy) return null;

  const rows = [];
  if (policy.deposit_percent != null) rows.push(['Deposit', `${policy.deposit_percent}% to begin your order`]);
  if (policy.rush_fee_percent != null) rows.push(['Rush orders', `+${policy.rush_fee_percent}% on the price`]);
  if (policy.quote_valid_days != null) rows.push(['Quotes', `Valid for ${policy.quote_valid_days} days`]);
  if (policy.free_fittings != null) rows.push(['Fittings', `${policy.free_fittings} included in your order`]);
  if (policy.alterations_window_days != null) rows.push(['Alterations', `Free adjustments for ${policy.alterations_window_days} days after delivery`]);
  if (policy.balance_before_pickup != null) rows.push(['Pickup', policy.balance_before_pickup ? 'Balance cleared before the garment is released' : 'Final payment at pickup']);

  return (
    <div className="mt-8 bg-white border border-[#E7E5E4] rounded-sm p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-4">How the studio works</p>
      <div className="divide-y divide-[#E7E5E4]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
            <span className="text-xs text-stone-400 shrink-0">{k}</span>
            <span className="text-xs text-stone-600 text-right">{v}</span>
          </div>
        ))}
      </div>
      {policy.deposit_policy && <p className="text-xs text-stone-500 mt-4 leading-relaxed whitespace-pre-line">{policy.deposit_policy}</p>}
      {policy.cancellation_policy && <p className="text-xs text-stone-500 mt-3 leading-relaxed whitespace-pre-line">{policy.cancellation_policy}</p>}
    </div>
  );
}