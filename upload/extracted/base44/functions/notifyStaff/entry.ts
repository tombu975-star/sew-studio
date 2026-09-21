import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const kind = body.kind;
    const recipientId = body.user_id;
    if (!['order_assigned', 'task_assigned', 'training_logged', 'production_note', 'status_update', 'mention'].includes(kind)) {
      return Response.json({ error: 'Unknown notification type' }, { status: 400 });
    }
    if (!recipientId || typeof recipientId !== 'string') {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const recipient = await base44.asServiceRole.entities.User.get(recipientId).catch(() => null);
    if (!recipient || !recipient.email) {
      return Response.json({ sent: false, reason: 'Recipient email unavailable' });
    }

    const shortDetail = String(body.detail || '').slice(0, 300);
    const headline = {
      order_assigned: 'A new order has been assigned to you.',
      task_assigned: 'A new task has been assigned to you.',
      training_logged: 'A new training entry has been logged for you.',
      production_note: 'A staff member left feedback on ongoing work.',
      status_update: 'An order assigned to you has changed status.',
      mention: 'You were mentioned in a team message.',
    }[kind];
    const subject = {
      order_assigned: 'New order assigned to you',
      task_assigned: 'New task assigned to you',
      training_logged: 'New training entry for you',
      production_note: 'New feedback on ongoing work',
      status_update: 'Order status update',
      mention: 'You were mentioned on the team board',
    }[kind] + " — Madam's Studio";

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipient.email,
      from_name: "Madam's Studio",
      subject,
      body: `Hello ${recipient.full_name || 'there'},\n\n${headline}\n\n${shortDetail}\n\nOpen Madam's Studio to view the details.\n\n— Madam's Studio`,
    });
    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}