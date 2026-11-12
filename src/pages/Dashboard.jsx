import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Plus, CalendarDays, AlertCircle, ChevronRight } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import {
  fetchOrders, fetchPayments, fetchFittings, fetchTasks, fetchUsers,
  fetchMaterials, fetchLabour, fetchAdditional, fetchTrips, fetchTripItems,
  userMap, orderCostTotal, orderPaidTotal
} from '@/lib/data';
import { formatCurrency, formatDate, shortDate, isWithinDays, ORDER_STATUSES, ACTIVE_STATUSES } from '@/lib/format';
import { fetchSettings, buildSuggestions, businessProjection, outstandingTotal, trueCostTotal, tripFulfilment, qualityPassRate, overdueTaskRate } from '@/lib/costing';
import BusinessProjection from '@/components/dashboard/BusinessProjection';
import ConversionReport from '@/components/dashboard/ConversionReport';
import YearlyPlanner from '@/components/dashboard/YearlyPlanner';
import IncomeStreams from '@/components/dashboard/IncomeStreams';
import BusinessHealth from '@/components/dashboard/BusinessHealth';
import AttentionList from '@/components/dashboard/AttentionList';
import ExpenseTracker from '@/components/dashboard/ExpenseTracker';
import FreelancerSpend from '@/components/dashboard/FreelancerSpend';
import EntrySourceBreakdown from '@/components/dashboard/EntrySourceBreakdown';
import Reminders from '@/components/dashboard/Reminders';
import StaffLeaderboard from '@/components/dashboard/StaffLeaderboard';
import DelegationTool from '@/components/dashboard/DelegationTool';
import IncomeTrendChart from '@/components/dashboard/IncomeTrendChart';
import TrendSuggestions from '@/components/dashboard/TrendSuggestions';
import AtelierCard from '@/components/AtelierCard';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';

export default function Dashboard() {
  const { isStaff, user, isTrainer, ownerLabel } = useRole();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchOrders(), fetchPayments(), fetchFittings(), fetchTasks(),
      fetchUsers(), fetchMaterials(), fetchLabour(), fetchAdditional(),
      fetchSettings().catch(() => null), fetchTrips(), fetchTripItems(),
      base44.entities.QualityCheck.list('-date', 500).catch(() => []),
      base44.entities.Asset.list('-created_date', 200).catch(() => []),
      base44.entities.FreelancerJob.list('-created_date', 500).catch(() => []),
      base44.entities.Freelancer.list().catch(() => [])
    ]).then(([orders, payments, fittings, tasks, users, materials, labour, additional, settings, trips, tripItems, qualityChecks, assets, freelancerJobs, freelancers]) => ({
      orders, payments, fittings, tasks, users, materials, labour, additional, settings, trips, tripItems, qualityChecks, assets, freelancerJobs, freelancers
    })).then(setData).catch(console.error);
  }, []);

  const m = useMemo(() => {
    if (!data) return null;
    const { orders, payments, fittings, tasks, users, materials, labour, additional, settings, trips, tripItems, qualityChecks, assets, freelancerJobs, freelancers } = data;
    const myOrders = isStaff && user ? orders.filter(o => o.assigned_staff_id === user.id) : orders;
    const myOrderIds = new Set(myOrders.map(o => o.id));
    const myPayments = isStaff ? payments.filter(p => myOrderIds.has(p.order_id)) : payments;
    const myFittings = isStaff ? fittings.filter(f => myOrderIds.has(f.order_id)) : fittings;
    const myTasks = isStaff && user ? tasks.filter(t => t.staff_id === user.id) : tasks;

    const now = new Date();
    const monthMatch = (d) => { const x = new Date(d); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); };

    const salesThisMonth = myOrders.filter(o => o.order_date && monthMatch(o.order_date)).reduce((s, o) => s + (Number(o.selling_price) || 0), 0);
    const receivedThisMonth = myPayments.filter(p => p.date && monthMatch(p.date)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const outstanding = myOrders.filter(o => o.status !== 'Completed' && o.status !== 'Collected/Delivered').reduce((s, o) => {
      const paid = orderPaidTotal(o.id, myPayments);
      return s + Math.max(0, (Number(o.selling_price) || 0) - paid);
    }, 0);
    const profit = myOrders.reduce((s, o) => s + ((Number(o.selling_price) || 0) - orderCostTotal(o.id, materials, labour, additional)), 0);

    const activeOrders = myOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
    const dueSoon = myOrders.filter(o => o.status !== 'Completed' && o.status !== 'Collected/Delivered' && isWithinDays(o.delivery_date, 7));
    const statusCounts = ORDER_STATUSES.map(s => ({ status: s, count: myOrders.filter(o => o.status === s).length }));
    const upcomingFittings = myFittings.filter(f => f.status === 'Scheduled').sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

    const staffUsers = (users || []);
    const staffWorkload = staffUsers.map(u => ({
      user: u,
      openTasks: (isStaff ? myTasks : tasks).filter(t => t.staff_id === u.id && t.status !== 'Done').length,
      activeOrders: myOrders.filter(o => o.assigned_staff_id === u.id && ACTIVE_STATUSES.includes(o.status)).length,
    }));
    const completedOrderStatuses = ['Completed', 'Collected/Delivered'];
    const staffLeaderboard = staffUsers.map(u => ({
      user: u,
      completedOrders: orders.filter(o => o.assigned_staff_id === u.id && completedOrderStatuses.includes(o.status) && o.updated_date && monthMatch(o.updated_date)).length,
      completedTasks: tasks.filter(t => t.staff_id === u.id && t.status === 'Done' && t.updated_date && monthMatch(t.updated_date)).length,
    }));

    const overhead = Number(settings?.overhead_amount) || 0;
    const suggestions = buildSuggestions({ orders, payments, materials, labour, additional, trips, items: tripItems, qualityChecks, settings, assets, fittings, tasks, users });
    const projection = businessProjection(orders, materials, labour, additional, overhead);

    // Business Health: On Track / Needs Attention / At Risk
    const overdrawn = suggestions.some(s => s.includes('drawn more'));
    const healthStatus = suggestions.length === 0 ? 'On Track' : (suggestions.length >= 3 || overdrawn) ? 'At Risk' : 'Needs Attention';
    const margins = projection.orders.map(o => (Number(o.selling_price) || 0) - trueCostTotal(o.id, materials, labour, additional, overhead));
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    let latestTrip = null;
    (trips || []).filter(t => t.status === 'Logged').forEach(t => {
      const r = tripFulfilment(t.id, tripItems);
      if (r !== null && (!latestTrip || new Date(t.date) > new Date(latestTrip.date))) latestTrip = { date: t.date, rate: r };
    });
    const health = { status: healthStatus, avgMargin, outstanding: outstandingTotal(orders, payments), fulfilment: latestTrip ? latestTrip.rate : null, qualityPassRate: qualityPassRate(qualityChecks), overdueTasks: overdueTaskRate(tasks) };

    return { myOrders, myPayments, myFittings, myTasks, salesThisMonth, receivedThisMonth, outstanding, profit, activeOrders, dueSoon, statusCounts, upcomingFittings, staffWorkload, staffLeaderboard, users, suggestions, projection, settings, health, materials, labour, freelancerJobs, freelancers };
  }, [data, isStaff, user]);

  const reload = () => {
    Promise.all([fetchOrders(), fetchTasks()]).then(([orders, tasks]) => {
      setData(prev => prev ? { ...prev, orders, tasks } : prev);
    });
  };

  const savePayout = async (amount) => {
    const s = m.settings;
    if (!s?.id) return;
    const updated = await base44.entities.Settings.update(s.id, { self_payout: amount });
    setData(prev => ({ ...prev, settings: updated }));
  };

  if (isTrainer) return <Navigate to="/trainees" replace />;
  if (!m) return <div className="p-10 text-stone-400 text-sm">Loading the atelier…</div>;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" />{today}</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>
            {isStaff ? 'Your Workbench' : `${ownerLabel}'s Atelier`}
          </h1>
          <p className="text-sm text-stone-500 mt-2">{isStaff ? 'Orders and tasks assigned to you.' : 'A snapshot of the studio today.'}</p>
        </div>
        <Link to="/orders/new" className="inline-flex items-center gap-2 px-5 py-3 bg-[#800020] text-white text-sm font-medium rounded-sm hover:bg-[#6b0018] transition self-start md:self-auto">
          <Plus className="w-4 h-4" /> New Custom Order
        </Link>
      </div>

      {/* Money row (Madam only) */}
      {!isStaff && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-5">
          <MetricCard label="Sales This Month" value={formatCurrency(m.salesThisMonth)} />
          <MetricCard label="Money Received" value={formatCurrency(m.receivedThisMonth)} accent />
          <MetricCard label="Outstanding" value={formatCurrency(m.outstanding)} />
          <MetricCard label="Estimated Profit" value={formatCurrency(m.profit)} accent />
        </div>
      )}

      {/* Delegation Tool (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <DelegationTool orders={m.myOrders} users={m.users} onChange={reload} />
        </div>
      )}

      {/* Work + People */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-5">
        <div className="lg:col-span-2 flex flex-col gap-3 md:gap-4">
          <AtelierCard title="Active Orders" action={<Link to="/orders" className="text-[11px] text-[#800020] font-medium hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>}>
            {m.activeOrders.length === 0 ? (
              <p className="text-sm text-stone-400 py-6 text-center">No active orders.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {m.activeOrders.slice(0, 8).map(o => (
                  <Link key={o.id} to={`/orders/${o.id}`} className="shrink-0 w-56 border border-[#E7E5E4] rounded-sm p-4 hover:border-[#800020]/40 transition group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[#1C1917] truncate group-hover:text-[#800020]">{o.garment_design?.slice(0, 40) || 'Untitled garment'}</p>
                    </div>
                    <p className="text-xs text-stone-400 mt-1">Deliver {shortDate(o.delivery_date)}</p>
                    <div className="mt-3"><StatusBadge status={o.status} /></div>
                  </Link>
                ))}
              </div>
            )}
          </AtelierCard>

          <AtelierCard title="Status Pipeline">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {m.statusCounts.map(({ status, count }) => (
                <div key={status} className="border border-[#E7E5E4] rounded-sm px-3 py-2.5">
                  <div className="font-display text-2xl font-semibold text-[#1C1917] leading-none">{count}</div>
                  <div className="text-[10px] text-stone-400 mt-1.5 leading-tight">{status}</div>
                </div>
              ))}
            </div>
          </AtelierCard>

          <AtelierCard title="Upcoming Fittings">
            {m.upcomingFittings.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No fittings scheduled.</p>
            ) : (
              <div className="divide-y divide-[#E7E5E4]">
                {m.upcomingFittings.map(f => {
                  const order = m.myOrders.find(o => o.id === f.order_id);
                  return (
                    <Link key={f.id} to={order ? `/orders/${order.id}` : '#'} className="flex items-center justify-between py-3 group">
                      <div>
                        <p className="text-sm font-medium text-[#1C1917] group-hover:text-[#800020]">{order?.garment_design?.slice(0, 40) || 'Order fitting'}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{formatDate(f.date)}</p>
                      </div>
                      <StatusBadge status={f.status} />
                    </Link>
                  );
                })}
              </div>
            )}
          </AtelierCard>
        </div>

        {/* People */}
        <AtelierCard title={isStaff ? 'My Open Tasks' : 'Staff Workload'}>
          {isStaff ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="font-display text-5xl font-semibold text-[#800020] leading-none">{m.myTasks.filter(t => t.status !== 'Done').length}</div>
              <p className="text-xs text-stone-400 mt-2">open tasks assigned to you</p>
              <Link to="/tasks" className="mt-4 text-[11px] text-[#800020] font-medium hover:underline">Go to My Tasks →</Link>
            </div>
          ) : m.staffWorkload.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">No staff members yet.</p>
          ) : (
            <div className="divide-y divide-[#E7E5E4]">
              {m.staffWorkload.map(({ user: u, openTasks, activeOrders }) => (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-xs font-semibold text-[#800020]">
                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1917] truncate">{u.full_name || u.email}</p>
                    <p className="text-[11px] text-stone-400">{activeOrders} active order{activeOrders !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="inline-flex items-center justify-center min-w-7 h-6 px-2 text-[11px] font-semibold text-[#800020] bg-[#800020]/10 rounded-full">{openTasks}</span>
                </div>
              ))}
            </div>
          )}
        </AtelierCard>
      </div>

      {/* Income Trend (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <IncomeTrendChart payments={m.myPayments} />
        </div>
      )}

      {/* Staff Leaderboard (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <StaffLeaderboard rows={m.staffLeaderboard} />
        </div>
      )}

      {/* Reminders (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <Reminders />
        </div>
      )}

      {/* Yearly Planner — featured (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5 rounded-sm border-l-2 border-amber-400 pl-3 md:pl-4">
          <YearlyPlanner orders={m.myOrders} />
        </div>
      )}

      {/* Business Projection (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <BusinessProjection projection={m.projection} payout={Number(m.settings?.self_payout) || 0} onPayoutSave={savePayout} />
        </div>
      )}

      {/* Order Conversion (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <ConversionReport orders={m.myOrders} />
        </div>
      )}

      {/* Income Streams (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <IncomeStreams />
        </div>
      )}

      {/* Entry Source breakdown (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <EntrySourceBreakdown />
        </div>
      )}

      {/* Monthly Expenses (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <ExpenseTracker materials={m.materials} labour={m.labour} />
        </div>
      )}

      {/* Freelancer Spend (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <FreelancerSpend jobs={m.freelancerJobs} freelancers={m.freelancers} orders={m.myOrders} />
        </div>
      )}

      {/* Business Health (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <BusinessHealth health={m.health} settings={m.settings} />
        </div>
      )}

      {/* RTW Trend Suggestions (Madam view) */}
      {!isStaff && (
        <div className="mb-4 md:mb-5">
          <TrendSuggestions />
        </div>
      )}

      {/* Needs Attention (Madam view) */}
      {!isStaff && <AttentionList items={m.suggestions} />}

    </div>
  );
}