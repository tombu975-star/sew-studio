import React, { useMemo } from 'react';
import AtelierCard from '@/components/AtelierCard';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency, shortDate } from '@/lib/format';

export default function FreelancerSpend({ jobs = [], freelancers = [], orders = [] }) {
  const { monthJobs, monthTotal, allTimeTotal, unpaidTotal, grouped } = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthJobs = jobs.filter(j => (j.created_date || '').slice(0, 7) === currentKey);
    const monthTotal = monthJobs.reduce((s, j) => s + (Number(j.cost) || 0), 0);
    const allTimeTotal = jobs.reduce((s, j) => s + (Number(j.cost) || 0), 0);
    const unpaidTotal = jobs.filter(j => j.status !== 'Paid').reduce((s, j) => s + (Number(j.cost) || 0), 0);

    const orderById = Object.fromEntries(orders.map(o => [o.id, o]));
    const byOrder = {};
    monthJobs.forEach(j => {
      const key = j.order_id || 'none';
      (byOrder[key] ||= { order: orderById[j.order_id] || null, jobs: [], total: 0 });
      byOrder[key].jobs.push(j);
      byOrder[key].total += Number(j.cost) || 0;
    });
    const grouped = Object.values(byOrder).sort((a, b) => b.total - a.total);
    return { monthJobs, monthTotal, allTimeTotal, unpaidTotal, grouped };
  }, [jobs, freelancers, orders]);

  const freelancerName = (id) => (freelancers.find(f => f.id === id)?.name) || 'Freelancer';

  return (
    <AtelierCard title="External Help (Freelancers)">
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="border border-[#800020]/30 bg-[#800020]/5 rounded-sm px-4 py-3">
          <div className="font-display text-xl md:text-2xl font-semibold text-[#800020] leading-none">{formatCurrency(monthTotal)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-wider">This Month</div>
        </div>
        <div className="border border-[#E7E5E4] rounded-sm px-4 py-3">
          <div className="font-display text-xl md:text-2xl font-semibold text-[#1C1917] leading-none">{formatCurrency(unpaidTotal)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-wider">Not Yet Paid</div>
        </div>
        <div className="border border-[#E7E5E4] rounded-sm px-4 py-3">
          <div className="font-display text-xl md:text-2xl font-semibold text-[#1C1917] leading-none">{formatCurrency(allTimeTotal)}</div>
          <div className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-wider">All Time</div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-stone-400 py-6 text-center">No freelancer jobs commissioned this month.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ order, jobs: orderJobs, total }) => (
            <div key={order?.id || 'none'} className="border border-[#E7E5E4] rounded-sm">
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#E7E5E4] bg-[#FBF9F7]">
                <p className="text-sm font-medium text-[#1C1917] truncate">{order?.garment_design?.slice(0, 50) || 'No linked order'}</p>
                <span className="text-sm font-semibold text-[#800020] shrink-0">{formatCurrency(total)}</span>
              </div>
              <div className="divide-y divide-[#E7E5E4]">
                {orderJobs.map(j => (
                  <div key={j.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-[#1C1917] truncate">{j.task_description?.slice(0, 50) || 'Job'}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{freelancerName(j.freelancer_id)}{j.due_date ? ` · due ${shortDate(j.due_date)}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={j.status} />
                      <span className="text-sm font-medium text-[#1C1917]">{formatCurrency(Number(j.cost) || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-stone-400 mt-3">Jobs are grouped by the month they were commissioned. Unpaid totals cover all jobs not yet marked Paid.</p>
    </AtelierCard>
  );
}