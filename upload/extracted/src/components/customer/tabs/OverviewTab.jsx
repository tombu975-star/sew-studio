import React from 'react';
import CustomerSnapshot from '@/components/customer/CustomerSnapshot';
import NotesPanel from '@/components/customer/NotesPanel';

export default function OverviewTab({ stats, isStaff, notes, uMap, customer }) {
  return (
    <div>
      <CustomerSnapshot stats={stats} isStaff={isStaff} />
      <div className="grid md:grid-cols-2 gap-4">
        <NotesPanel notes={notes} uMap={uMap} />
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Customer Fit Summary</h3>
          {customer.designer_fit_observation ? (
            <p className="text-sm text-stone-600 whitespace-pre-wrap">{customer.designer_fit_observation}</p>
          ) : <p className="text-sm text-stone-400">No fit observation recorded yet — add one from the Proportions & Fit tab.</p>}
          {customer.special_instructions && (
            <div className="mt-4 pt-4 border-t border-[#E7E5E4]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1">Special Instructions</p>
              <p className="text-sm text-stone-600">{customer.special_instructions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}