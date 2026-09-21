import React from 'react';

function Row({ label, value }) {
  return <div className="flex justify-between text-sm py-1.5 border-b border-[#E7E5E4] last:border-0"><span className="text-stone-500">{label}</span><span className="font-medium text-[#1C1917] text-right max-w-[60%]">{value || '—'}</span></div>;
}

export default function CustomerStyleSummary({ customer, latestSet, orders, dataConfidence, confidenceNote }) {
  const confColor = dataConfidence === 'Complete' ? 'text-[#15803D]' : dataConfidence === 'Good' ? 'text-[#B45309]' : 'text-stone-500';
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4]">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Customer Style Profile</h3>
      </div>
      <div className="p-5">
        <Row label="Customer" value={customer.name} />
        <Row label="Customer Type" value={(customer.customer_type || []).join(', ')} />
        <Row label="Preferred Styles" value={(customer.preferred_styles || []).join(', ')} />
        <Row label="Favourite Colours" value={customer.favourite_colours} />
        <Row label="Colours to Avoid" value={customer.colours_to_avoid} />
        <Row label="Favourite Fabrics" value={customer.favourite_fabrics} />
        <Row label="Fabrics to Avoid" value={customer.fabrics_to_avoid} />
        <Row label="Preferred Fit" value={customer.preferred_fit} />
        <Row label="Designer Fit Observation" value={customer.designer_fit_observation} />
        <Row label="Height" value={latestSet?.height ? `${latestSet.height} (${latestSet.unit || ''})` : null} />
        <Row label="Overall Proportion" value={customer.overall_proportion} />
        <Row label="Active Orders" value={orders.filter(o => !['Completed', 'Collected/Delivered'].includes(o.status)).length} />
        {dataConfidence && (
          <div className="mt-3 pt-3 border-t border-[#E7E5E4]">
            <div className="flex justify-between text-sm"><span className="text-stone-500">Style Assist Confidence</span><span className={`font-semibold ${confColor}`}>{dataConfidence}</span></div>
            {confidenceNote && <p className="text-xs text-stone-400 mt-1">{confidenceNote}</p>}
          </div>
        )}
      </div>
    </div>
  );
}