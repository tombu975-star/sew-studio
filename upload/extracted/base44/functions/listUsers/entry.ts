import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Any signed-in app user needs to see staff names (assignment dropdowns, "assigned to" labels),
// but only admins may call User.list() directly — so this function does that lookup with the
// service role and returns only the safe display fields.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await base44.asServiceRole.entities.User.list();
    const safe = users.map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, gender: u.gender }));
    return Response.json(safe);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}