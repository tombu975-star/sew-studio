import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, StickyNote, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/format';
import MonthlyPlanDialog from '@/components/dashboard/MonthlyPlanDialog';
import SeasonOutlook from '@/components/dashboard/SeasonOutlook';
import CloseYearDialog from '@/components/dashboard/CloseYearDialog';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function YearlyPlanner({ orders }) {
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth();
  const [year, setYear] = useState(nowYear);
  const [plans, setPlans] = useState({});
  const [closed, setClosed] = useState({});
  const [closing, setClosing] = useState(false);
  const [editMonth, setEditMonth] = useState(null);

  useEffect(() => {
    base44.entities.MonthlyPlan.list()
      .then(list => setPlans(Object.fromEntries(list.map(p => [p.month, p]))))
      .catch(console.error);
    base44.entities.ClosedYear.list()
      .then(list => setClosed(Object.fromEntries(list.map(c => [String(c.year), c]))))
      .catch(console.error);
  }, []);

  const months = useMemo(() => MONTHS.map((name, i) => {
    const due = orders.filter(o => {
      if (!o.delivery_date) return false;
      const d = new Date(o.delivery_date);
      return d.getFullYear() === year && d.getMonth() === i;
    });
    const revenue = due.reduce((s, o) => s + (Number(o.selling_price) || 0), 0);
    const open = due.filter(o => o.status !== 'Completed' && o.status !== 'Collected/Delivered').length;
    const plan = plans[`${year}-${String(i + 1).padStart(2, '0')}`] || null;
    const events = plan?.events?.length ? plan.events : (plan?.occasion ? [plan.occasion] : []);
    return {
      name, index: i, count: due.length, open, revenue,
      key: `${year}-${String(i + 1).padStart(2, '0')}`,
      plan, events,
    };
  }), [orders, year, plans]);

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalOrders = months.reduce((s, m) => s + m.count, 0);
  const totalTarget = months.reduce((s, m) => s + (m.plan?.target_revenue || 0), 0);
  const max = Math.max(...months.map(m => Math.max(m.revenue, m.plan?.target_revenue || 0)), 1);
  const monthsViz = months.map(m => ({ ...m, busy: m.revenue >= max * 0.7 || m.events.length >= 2 }));
  const busyMonths = monthsViz.filter(m => m.busy);
  const isClosed = !!closed[year];

  const savePlan = async (data) => {
    const existing = plans[data.month];
    if (existing) {
      const updated = await base44.entities.MonthlyPlan.update(existing.id, data);
      setPlans(p => ({ ...p, [data.month]: updated }));
    } else {
      const created = await base44.entities.MonthlyPlan.create(data);
      setPlans(p => ({ ...p, [data.month]: created }));
    }
    setEditMonth(null);
  };

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-[#800020]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Yearly Planner</h3>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setYear(y => y - 1)} className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-[#800020]"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-display text-lg font-semibold text-[#1C1917] w-14 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-[#800020]"><ChevronRight className="w-4 h-4" /></button>
          {year < nowYear && (closed[year]
            ? <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#15803D]/10 text-[#15803D] text-[10px] font-semibold"><Lock className="w-3 h-3" />Closed</span>
            : <button onClick={() => setClosing(true)} className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E7E5E4] text-[11px] font-medium text-stone-500 hover:border-[#800020] hover:text-[#800020] transition"><Lock className="w-3 h-3" />Close {year}</button>)}
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm text-stone-500 mb-4">
          <span className="font-medium text-[#1C1917]">{totalOrders} order{totalOrders !== 1 ? 's' : ''}</span> delivering in {year} —
          <span className="font-medium text-[#800020] ml-1">{formatCurrency(totalRevenue)}</span> projected
          {totalTarget > 0 && <> against a <span className="font-medium text-amber-700">{formatCurrency(totalTarget)}</span> target</>}.
          {isClosed ? `This year is closed — its numbers are locked for comparison in Business History.` : `Tap any month to plan around occasions and season.`}
          {busyMonths.length > 0 && <> Busy periods to watch: <span className="font-medium text-amber-700">{busyMonths.map(m => m.name).join(' · ')}</span>.</>}
        </p>
        <SeasonOutlook months={monthsViz} />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {monthsViz.map(m => {
            const current = year === nowYear && m.index === nowMonth;
            const target = m.plan?.target_revenue;
            const hit = target != null && m.revenue >= target;
            return (
              <button key={m.key} onClick={() => !isClosed && setEditMonth(m)}
                className={`border rounded-sm p-3 text-left hover:border-[#800020]/50 hover:shadow-sm transition ${current ? 'border-[#800020]/40 bg-[#800020]/[0.03]' : m.busy ? 'border-amber-300/80 bg-amber-50/40' : 'border-[#E7E5E4] bg-white'}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400 flex items-center gap-1.5">
                    {m.name}
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${target != null ? (hit ? 'bg-[#15803D]' : 'bg-amber-400') : 'bg-stone-300'}`}
                      title={target != null ? (hit ? 'On Track' : 'Behind target') : 'No data'}
                    />
                  </span>
                  {m.open > 0 && <span className="text-[10px] font-semibold text-[#800020]">{m.open} open</span>}
                </div>
                {m.events.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.events.slice(0, 2).map((ev, i) => (
                      <span key={i} title={ev} className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 rounded-sm">
                        {ev.length > 18 ? ev.slice(0, 18) + '…' : ev}
                      </span>
                    ))}
                    {m.events.length > 2 && <span className="self-center text-[9px] text-amber-700">+{m.events.length - 2}</span>}
                  </div>
                )}
                <div className="font-display text-xl font-semibold text-[#1C1917] mt-1 leading-tight">{m.revenue > 0 ? formatCurrency(m.revenue) : '—'}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  {m.count} order{m.count !== 1 ? 's' : ''} due
                  {target != null && <> · <span className={hit ? 'text-[#15803D] font-semibold' : 'text-amber-700 font-semibold'}>Target {formatCurrency(target)}</span></>}
                </div>
                <div className="space-y-1 mt-2">
                  <div className="h-1 bg-[#F3F1EF] rounded-full"><div className="h-1 bg-[#800020]/70 rounded-full" style={{ width: `${(m.revenue / max) * 100}%` }} /></div>
                  {target != null && <div className="h-1 bg-[#F3F1EF] rounded-full"><div className="h-1 bg-amber-400/80 rounded-full" style={{ width: `${(target / max) * 100}%` }} /></div>}
                </div>
                {m.plan?.notes && <div className="flex items-center gap-1 mt-1.5 text-[9px] text-stone-400"><StickyNote className="w-3 h-3" />{m.plan.notes.length > 34 ? m.plan.notes.slice(0, 34) + '…' : m.plan.notes}</div>}
              </button>
            );
          })}
        </div>
      </div>
      {closing && (
        <CloseYearDialog
          open
          year={year}
          onClose={() => setClosing(false)}
          onClosed={rec => setClosed(p => ({ ...p, [String(rec.year)]: rec }))}
        />
      )}
      {editMonth && !isClosed && (
        <MonthlyPlanDialog
          open={!!editMonth}
          onClose={() => setEditMonth(null)}
          onSave={savePlan}
          monthKey={editMonth.key}
          monthLabel={`${editMonth.name} ${year}`}
          plan={editMonth.plan}
        />
      )}
    </div>
  );
}