import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Scheduled runs arrive without a user token; block direct non-admin calls if a user is present.
    const caller = await base44.auth.me().catch(() => null);
    if (caller && caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [users, tasks, fittings, orders, payments, reminders] = await Promise.all([
      base44.asServiceRole.entities.User.list().catch(() => []),
      base44.asServiceRole.entities.Task.list().catch(() => []),
      base44.asServiceRole.entities.Fitting.list().catch(() => []),
      base44.asServiceRole.entities.Order.list().catch(() => []),
      base44.asServiceRole.entities.Payment.list().catch(() => []),
      base44.asServiceRole.entities.Reminder.list().catch(() => []),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const orderById = Object.fromEntries(orders.map(o => [o.id, o]));
    const openTasks = tasks.filter(t => t.status !== 'Done' && (!t.due_date || t.due_date >= today));
    const upcomingFittings = fittings.filter(f => f.status === 'Scheduled' && f.date && f.date >= today);
    const stalledEnquiries = orders
      .filter(o => ['Enquiry', 'Quoted'].includes(o.status) && o.order_date &&
        Math.floor((Date.now() - new Date(o.order_date)) / 86400000) > 14)
      .sort((a, b) => a.order_date.localeCompare(b.order_date));
    const fittingsAwaitingFeedback = fittings
      .filter(f => f.date && f.date < today && !f.outcome_notes)
      .sort((a, b) => a.date.localeCompare(b.date));
    const openReminders = reminders.filter(r => !r.done)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 10);
    const overdueOrders = orders.filter(o => o.delivery_date && o.delivery_date < today && o.status !== 'Collected/Delivered' && o.status !== 'Completed')
      .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date));
    const unpaidOrders = orders
      .filter(o => ['Ready', 'Collected/Delivered', 'Completed'].includes(o.status))
      .map(o => {
        const paid = payments.filter(p => p.order_id === o.id).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const owed = (Number(o.selling_price) || 0) - paid;
        return owed > 0 ? { order: o, owed } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.owed - a.owed);

    const results = [];
    for (const u of users) {
      if (!u.email) continue;
      const isAdmin = u.role === 'admin';

      const myTasks = openTasks
        .filter(t => t.staff_id === u.id)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 15);
      const myFittings = upcomingFittings
        .filter(f => isAdmin || orderById[f.order_id]?.assigned_staff_id === u.id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);

      const myOverdue = isAdmin ? overdueOrders : [];
      const myUnpaid = isAdmin ? unpaidOrders : [];
      const myStalled = isAdmin ? stalledEnquiries : [];
      const myAwaiting = isAdmin ? fittingsAwaitingFeedback : [];
      const myReminders = isAdmin ? openReminders : [];
      if (myTasks.length === 0 && myFittings.length === 0 && myOverdue.length === 0 && myUnpaid.length === 0 &&
          myStalled.length === 0 && myAwaiting.length === 0 && myReminders.length === 0) continue;

      const lines = [`Good morning ${u.full_name || 'there'},`, '', 'YOUR TASKS'];
      if (myTasks.length === 0) {
        lines.push('No open tasks assigned to you.');
      } else {
        myTasks.forEach(t => lines.push(`- ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}${t.priority && t.priority !== 'Low' ? ` — ${t.priority} priority` : ''}`));
      }
      lines.push('', 'SCHEDULED FITTINGS');
      if (myFittings.length === 0) {
        lines.push('No fittings scheduled for you.');
      } else {
        myFittings.forEach(f => {
          const garment = orderById[f.order_id]?.garment_design || 'Order fitting';
          lines.push(`- ${garment.slice(0, 60)} — ${f.date}`);
        });
      }
      if (isAdmin) {
        lines.push('', 'YOUR REMINDERS');
        if (myReminders.length === 0) {
          lines.push('No open reminders.');
        } else {
          myReminders.forEach(r => lines.push(`- ${r.date < today ? 'OVERDUE: ' : ''}${r.note} (${r.date})`));
        }
        lines.push('', 'OVERDUE ORDERS');
        if (myOverdue.length === 0) {
          lines.push('Nothing overdue — well done.');
        } else {
          myOverdue.forEach(o => lines.push(`- ${o.garment_design?.slice(0, 60) || 'Order'} — was due ${o.delivery_date}`));
        }
        lines.push('', 'PAYMENT FOLLOW-UPS');
        if (myUnpaid.length === 0) {
          lines.push('No outstanding balances to chase.');
        } else {
          myUnpaid.forEach(({ order, owed }) => lines.push(`- ${order.garment_design?.slice(0, 60) || 'Order'} — owes GHS ${owed}`));
        }
        lines.push('', 'STALLED ENQUIRIES');
        if (myStalled.length === 0) {
          lines.push('No stalled enquiries.');
        } else {
          myStalled.forEach(o => lines.push(`- ${o.garment_design?.slice(0, 60) || 'Order'} — ${o.status.toLowerCase()} since ${o.order_date}`));
        }
        lines.push('', 'FITTINGS AWAITING FEEDBACK');
        if (myAwaiting.length === 0) {
          lines.push('All fitting outcomes are recorded.');
        } else {
          myAwaiting.forEach(f => {
            const garment = orderById[f.order_id]?.garment_design || 'Order fitting';
            lines.push(`- ${garment.slice(0, 60)} — fitting on ${f.date} has no outcome recorded`);
          });
        }
      }
      lines.push('', "Open Madam's Studio to view full details.", '', "— Madam's Studio");

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        from_name: "Madam's Studio",
        subject: 'Your day at the studio',
        body: lines.join('\n'),
      });
      results.push({ user: u.email, tasks: myTasks.length, fittings: myFittings.length });
    }

    return Response.json({ sent: results.length, details: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}