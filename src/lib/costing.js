import { base44 } from '@/api/base44Client';
import { orderCostTotal, orderPaidTotal } from '@/lib/data';
import { formatCurrency, formatDate } from '@/lib/format';

export const PROJECTION_STATUSES = ['In Production', 'Fitting', 'Alterations', 'Ready'];

export async function fetchSettings() {
  const rows = await base44.entities.Settings.list('-created_date', 10);
  const s = rows.length > 0 ? rows[0]
    : await base44.entities.Settings.create({ overhead_amount: 0, outstanding_threshold: 2000, self_payout: 0 });
  // Itemized overhead: while overhead items exist, their total replaces the flat amount
  try {
    const items = await base44.entities.OverheadItem.list('-created_date', 100);
    if (items.length > 0) {
      const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      return { ...s, overhead_amount: total, overhead_items: items };
    }
  } catch (e) { /* fall back to the flat amount */ }
  return s;
}

// True Cost = materials + labour + flat overhead + additional costs
export function trueCostTotal(orderId, materials, labour, additional, overhead = 0) {
  return orderCostTotal(orderId, materials, labour, additional) + (Number(overhead) || 0);
}

// Sums true cost and margin across orders in production-stage statuses
export function businessProjection(orders, materials, labour, additional, overhead = 0) {
  const active = (orders || []).filter(o => PROJECTION_STATUSES.includes(o.status));
  let trueCost = 0;
  let margin = 0;
  active.forEach(o => {
    const tc = trueCostTotal(o.id, materials, labour, additional, overhead);
    trueCost += tc;
    margin += (Number(o.selling_price) || 0) - tc;
  });
  return { orders: active, trueCost, margin };
}

// Obtained items divided by total items on the trip; null when the trip has no items
export function tripFulfilment(tripId, items) {
  const list = (items || []).filter(i => i.trip_id === tripId);
  if (list.length === 0) return null;
  return list.filter(i => i.obtained).length / list.length;
}

export function outstandingTotal(orders, payments) {
  return (orders || []).filter(o => o.status !== 'Completed' && o.status !== 'Collected/Delivered').reduce((s, o) => {
    const paid = orderPaidTotal(o.id, payments);
    return s + Math.max(0, (Number(o.selling_price) || 0) - paid);
  }, 0);
}

// Data-driven flags for the Dashboard's "Needs Your Attention" section
export function buildSuggestions({ orders, payments, materials, labour, additional, trips, items, qualityChecks, settings, assets, fittings, tasks, users }) {
  const out = [];
  const overhead = Number(settings?.overhead_amount) || 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  (orders || []).forEach(o => {
    const selling = Number(o.selling_price) || 0;
    if (selling > 0 && selling <= trueCostTotal(o.id, materials, labour, additional, overhead)) {
      out.push(`Pricing alert: ${o.garment_design?.slice(0, 60) || 'an order'} is priced at or below cost.`);
    }
  });

  const payout = Number(settings?.self_payout) || 0;
  const projection = businessProjection(orders, materials, labour, additional, overhead);
  if (payout > 0 && payout > projection.margin) {
    out.push("You've drawn more than the business has currently earned.");
  }

  (trips || []).filter(t => t.status === 'Logged').forEach(t => {
    const rate = tripFulfilment(t.id, items);
    if (rate !== null && rate < 0.7) {
      out.push(`${formatDate(t.date)} Accra Run: only ${Math.round(rate * 100)}% of planned items were obtained.`);
    }
  });

  // Quality: a failed check with no later Pass logged for the same stage
  (orders || []).forEach(o => {
    const byStage = {};
    (qualityChecks || []).filter(q => q.order_id === o.id).forEach(q => {
      (byStage[q.stage] = byStage[q.stage] || []).push(q);
    });
    Object.entries(byStage).forEach(([stage, list]) => {
      const sorted = list.slice().sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.created_date) - new Date(b.created_date));
      if (sorted[sorted.length - 1].result === 'Needs Rework') {
        out.push(`Quality alert: ${o.garment_design?.slice(0, 50) || 'an order'} failed ${stage} check and hasn't been re-checked.`);
      }
    });
  });

  // Assets: flag anything needing repair, or stuck Under Repair for over 7 days
  (assets || []).forEach(a => {
    const stuckUnderRepair = a.status === 'Under Repair' && a.updated_date && (Date.now() - new Date(a.updated_date)) > 7 * 86400000;
    if (a.condition === 'Needs Repair' || stuckUnderRepair) {
      out.push(`Asset alert: ${a.name || 'an asset'} needs attention.`);
    }
    if (a.next_service_due && new Date(a.next_service_due) <= new Date()) {
      out.push(`${a.name || 'An asset'} is due for a checkup (was scheduled for ${formatDate(a.next_service_due)}).`);
    }
  });

  // Fittings awaiting feedback: date has passed but no outcome recorded yet
  (fittings || []).forEach(f => {
    if (f.date && f.date < todayStr && !f.outcome_notes) {
      if (f.status === 'Scheduled') {
        out.push(`Fitting missed: a fitting on ${formatDate(f.date)} is still marked Scheduled — update or reschedule it.`);
      } else {
        out.push(`Fitting awaiting feedback: the ${formatDate(f.date)} fitting has no outcome recorded — log what happened.`);
      }
    }
  });

  // Stalled enquiries: still at Enquiry or Quoted more than 14 days after the order date
  (orders || []).forEach(o => {
    if (['Enquiry', 'Quoted'].includes(o.status) && o.order_date) {
      const days = Math.floor((Date.now() - new Date(o.order_date)) / 86400000);
      if (days > 14) {
        out.push(`Stalled enquiry: ${o.garment_design?.slice(0, 50) || 'an order'} has been ${o.status.toLowerCase()} for ${days} days — follow up or close it.`);
      }
    }
  });

  // Overdue: past delivery date but not yet delivered
  const today = new Date().toISOString().slice(0, 10);
  (orders || []).forEach(o => {
    if (o.delivery_date && o.delivery_date < today && o.status !== 'Collected/Delivered' && o.status !== 'Completed') {
      out.push(`Overdue: ${o.garment_design?.slice(0, 50) || 'an order'} was due ${formatDate(o.delivery_date)} and hasn't been delivered.`);
    }
  });

  // Payment follow-up: orders at Ready or beyond that still owe money
  (orders || []).forEach(o => {
    if (['Ready', 'Collected/Delivered', 'Completed'].includes(o.status)) {
      const owed = (Number(o.selling_price) || 0) - orderPaidTotal(o.id, payments);
      if (owed > 0) {
        out.push(`Payment follow-up: ${o.garment_design?.slice(0, 50) || 'an order'} still owes ${formatCurrency(owed)}.`);
      }
    }
  });

  const threshold = Number(settings?.outstanding_threshold) || 0;
  const outstanding = outstandingTotal(orders, payments);
  if (threshold > 0 && outstanding > threshold) {
    out.push(`${formatCurrency(outstanding)} is currently outstanding across your orders.`);
  }

  // People: flag anyone whose active work is significantly above the typical load
  const typical = Number(settings?.typical_load) || 5;
  const activeWorkStatuses = ['Confirmed', 'Deposit Paid', 'In Production', 'Fitting', 'Alterations', 'Ready'];
  (users || []).forEach(u => {
    const openTasks = (tasks || []).filter(t => t.staff_id === u.id && t.status !== 'Done').length;
    const activeOrders = (orders || []).filter(o => o.assigned_staff_id === u.id && activeWorkStatuses.includes(o.status)).length;
    if (openTasks + activeOrders > typical * 1.5) {
      out.push(`${u.full_name || u.email || 'A team member'} has more active work than usual (${openTasks} open tasks, ${activeOrders} active orders).`);
    }
  });

  return out;
}

// Overdue open tasks as a share of all open tasks; null when there are no open tasks
export function overdueTaskRate(tasks, todayStr = new Date().toISOString().slice(0, 10)) {
  const open = (tasks || []).filter(t => t.status !== 'Done');
  if (open.length === 0) return null;
  return open.filter(t => t.due_date && t.due_date < todayStr).length / open.length;
}

// True when an order has at least one Final-stage Pass check — required before "Ready"
export function finalQualityPassed(orderId, qualityChecks) {
  return (qualityChecks || []).some(q => q.order_id === orderId && q.stage === 'Final' && q.result === 'Pass');
}

// Business Health Score: five signals, up to 20 points each, missing signals excluded
export function healthSignalScores(health, settings) {
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const marginTarget = Number(settings?.margin_target) || 250;
  const outstandingTarget = Number(settings?.outstanding_threshold) || 2000;
  const signals = [
    {
      key: 'margin',
      label: 'Avg. Margin',
      detail: `${formatCurrency(health.avgMargin)} vs target ${formatCurrency(marginTarget)}`,
      value: 20 * clamp01(health.avgMargin / marginTarget),
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      detail: `${formatCurrency(health.outstanding)} vs threshold ${formatCurrency(outstandingTarget)}`,
      value: 20 * (health.outstanding <= outstandingTarget ? 1 : clamp01(1 - (health.outstanding - outstandingTarget) / outstandingTarget)),
    },
    {
      key: 'fulfilment',
      label: 'Accra Run',
      detail: health.fulfilment === null ? 'no logged trips yet' : `${Math.round(health.fulfilment * 100)}% vs 70% benchmark`,
      value: health.fulfilment === null ? null : 20 * clamp01(health.fulfilment / 0.7),
    },
    {
      key: 'quality',
      label: 'Quality',
      detail: health.qualityPassRate === null ? 'no checks logged yet' : `${Math.round(health.qualityPassRate * 100)}% vs 80% benchmark`,
      value: health.qualityPassRate === null ? null : 20 * clamp01(health.qualityPassRate / 0.8),
    },
    {
      key: 'overdue',
      label: 'Overdue Tasks',
      detail: health.overdueTasks === null ? 'no open tasks' : `${Math.round(health.overdueTasks * 100)}% of open tasks overdue`,
      value: health.overdueTasks === null ? null : 20 * clamp01((0.2 - health.overdueTasks) / 0.2),
    },
  ];
  const present = signals.filter(s => s.value !== null);
  const total = present.reduce((sum, s) => sum + s.value, 0);
  const score = present.length === 0 ? 0 : Math.round((total / (present.length * 20)) * 100);
  return { signals, score };
}

// Pass rate across checks logged in the last 30 days; null when none logged
export function qualityPassRate(qualityChecks, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = (qualityChecks || []).filter(q => q.date && new Date(q.date) >= cutoff);
  if (recent.length === 0) return null;
  return recent.filter(q => q.result === 'Pass').length / recent.length;
}