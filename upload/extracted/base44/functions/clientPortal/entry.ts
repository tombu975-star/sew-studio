import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    // Public client-portal endpoint: the portal token is the shared secret.
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    if (!token || token.length < 10) {
      return Response.json({ error: 'Invalid link' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const customers = await base44.asServiceRole.entities.Customer.filter({ portal_token: token });
    if (!customers.length) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const customer = customers[0];

    const orders = await base44.asServiceRole.entities.Order.filter({ customer_id: customer.id });
    const result = [];
    for (const o of orders) {
      const fittings = await base44.asServiceRole.entities.Fitting.filter({ order_id: o.id });
      const latest = fittings.length
        ? fittings.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0]
        : null;
      result.push({
        garment: o.garment_design || 'Custom garment',
        status: o.status,
        order_date: o.order_date,
        delivery_date: o.delivery_date,
        fitting: latest ? { date: latest.date, status: latest.status, notes: latest.outcome_notes || null } : null,
      });
    }
    result.sort((a, b) => String(b.order_date || '').localeCompare(String(a.order_date || '')));

    // Studio policies, bounded to the client-facing fields only.
    const policies = await base44.asServiceRole.entities.Policy.list();
    const p = policies[0] || null;
    const policy = p ? {
      deposit_percent: p.deposit_percent ?? null,
      rush_fee_percent: p.rush_fee_percent ?? null,
      quote_valid_days: p.quote_valid_days ?? null,
      free_fittings: p.free_fittings ?? null,
      alterations_window_days: p.alterations_window_days ?? null,
      balance_before_pickup: p.balance_before_pickup ?? null,
      deposit_policy: p.deposit_policy || null,
      cancellation_policy: p.cancellation_policy || null,
    } : null;

    // Only the client's first name — no contact details leave the studio.
    return Response.json({
      name: String(customer.name || '').split(' ')[0],
      orders: result,
      policy,
    });
  } catch (error) {
    return Response.json({ error: String(error?.message || 'Error') }, { status: 500 });
  }
}