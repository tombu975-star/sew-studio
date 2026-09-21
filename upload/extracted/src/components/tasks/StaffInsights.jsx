import React, { useEffect, useState } from 'react';
import { Sparkles, Layers, Target, ShieldCheck, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { shortDate } from '@/lib/format';

const monthKeyOf = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toISOString().slice(0, 7);
};

export default function StaffInsights({ orders, userId }) {
  const [history, setHistory] = useState([]);
  const [checks, setChecks] = useState([]);

  useEffect(() => {
    if (!userId) return;
    base44.entities.OrderStatusHistory.filter({ changed_by: userId }, '-date', 500).then(setHistory).catch(() => setHistory([]));
    base44.entities.QualityCheck.filter({ inspector_id: userId }, '-date', 500).then(setChecks).catch(() => setChecks([]));
  }, [userId]);

  const thisMonthKey = monthKeyOf(0);
  const lastMonthKey = monthKeyOf(1);
  const thisMonthHistory = history.filter(h => h.date?.startsWith(thisMonthKey));
  const lastMonthHistory = history.filter(h => h.date?.startsWith(lastMonthKey));
  const completed = thisMonthHistory.filter(h => h.status === 'Completed').length;
  const completedLastMonth = lastMonthHistory.filter(h => h.status === 'Completed').length;
  const alterations = thisMonthHistory.filter(h => h.status === 'Alterations').length;

  const activeOrders = orders.filter(o => o.status !== 'Completed' && o.status !== 'Collected/Delivered');
  const byStatus = activeOrders.reduce((acc, o) => { (acc[o.status] = acc[o.status] || []).push(o); return acc; }, {});
  const busiestStatus = Object.entries(byStatus).sort((a, b) => b[1].length - a[1].length)[0];

  const checksThisMonth = checks.filter(c => c.date?.startsWith(thisMonthKey));
  const passCount = checksThisMonth.filter(c => c.result === 'Pass').length;
  const reworkCount = checksThisMonth.filter(c => c.result === 'Needs Rework').length;

  const nextDue = [...activeOrders].filter(o => o.delivery_date).sort((a, b) => new Date(a.delivery_date) - new Date(b.delivery_date))[0];

  const messages = [];

  // Productivity insight
  if (completed > 0 || completedLastMonth > 0) {
    let msg = `You've completed ${completed} garment${completed !== 1 ? 's' : ''} this month`;
    if (alterations > 0) msg += ` with ${alterations} alteration${alterations !== 1 ? 's' : ''}`;
    msg += '.';
    if (completedLastMonth > 0) {
      if (completed > completedLastMonth) msg += ` That's up from ${completedLastMonth} last month — great pace.`;
      else if (completed < completedLastMonth) msg += ` That's down from ${completedLastMonth} last month.`;
      else msg += ` Same pace as last month (${completedLastMonth}).`;
    }
    if (completed >= 5 && alterations === 0) {
      msg += ' Strong finishing record — you may be ready for an advanced training module.';
    }
    messages.push({ icon: Sparkles, text: msg });
  }

  // Quality recommendation
  if (checksThisMonth.length > 0) {
    let msg = `${passCount} of ${checksThisMonth.length} quality checks passed this month`;
    if (reworkCount > 0) {
      msg += ` — ${reworkCount} needed rework. Slow down on final checks before sending pieces to Ready.`;
      messages.push({ icon: ShieldAlert, text: msg });
    } else {
      msg += '. Clean sheet — keep it up.';
      messages.push({ icon: ShieldCheck, text: msg });
    }
  }

  // Work recommendation
  if (nextDue) {
    messages.push({
      icon: Target,
      text: `Focus next on "${nextDue.garment_design || 'this order'}" — due ${shortDate(nextDue.delivery_date)}.`,
    });
  }

  // Workload insight
  if (busiestStatus && busiestStatus[1].length >= 2) {
    const [status, list] = busiestStatus;
    const dueDates = list.map(o => o.delivery_date).filter(Boolean).sort();
    const earliest = dueDates[0];
    messages.push({
      icon: Layers,
      text: `${list.length} orders are currently at ${status}${earliest ? `, all due before ${shortDate(earliest)}` : ''} — clear these before starting new work.`,
    });
  }

  if (messages.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Your Progress</h2>
      {messages.map((m, i) => (
        <div key={i} className="bg-white border border-[#E7E5E4] rounded-sm p-4 flex items-start gap-3">
          <m.icon className="w-4 h-4 text-[#800020] mt-0.5 shrink-0" />
          <p className="text-sm text-[#1C1917] leading-snug">{m.text}</p>
        </div>
      ))}
    </div>
  );
}