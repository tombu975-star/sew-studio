import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Rule-based recommendations from real SOP + order data — no LLM guessing.
// Every recommendation states what triggered it, why it matters, and the action to take.
// If there isn't enough data yet, we say so instead of inventing a signal.

function daysBetween(a, b) {
  return Math.round((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [assignments, exceptions, sops] = await Promise.all([
      base44.entities.SOPAssignment.list('-created_date', 500),
      base44.entities.SOPException.list('-created_date', 300),
      base44.entities.SOP.list('-created_date', 300),
    ]);

    const sopMap = Object.fromEntries(sops.map(s => [s.id, s]));
    const now = new Date();
    const recs = [];

    // --- Madam-level: overdue / incomplete assignments per SOP ---
    const bySop = {};
    assignments.forEach(a => {
      if (!bySop[a.sop_id]) bySop[a.sop_id] = [];
      bySop[a.sop_id].push(a);
    });
    Object.entries(bySop).forEach(([sopId, list]) => {
      if (list.length < 3) return; // not enough volume yet
      const incomplete = list.filter(a => ['Incomplete', 'Returned', 'Exception', 'Escalated'].includes(a.status));
      const rate = incomplete.length / list.length;
      if (rate >= 0.34) {
        recs.push({
          audience: 'madam',
          trigger: `${incomplete.length} of ${list.length} assignments of "${sopMap[sopId]?.title || 'this SOP'}" ended incomplete, exception or escalated`,
          why: 'A high incompletion rate on one procedure usually means the SOP itself, staffing, or training needs attention — not just one person.',
          action: `Review the "${sopMap[sopId]?.title || 'SOP'}" procedure with the team, or assign related training.`,
          related: sopMap[sopId]?.title,
          priority: rate >= 0.5 ? 'high' : 'medium',
        });
      }
    });

    // --- Madam-level: overdue assignments ---
    const overdue = assignments.filter(a => a.due_date && new Date(a.due_date) < now && !['Completed', 'Compliant', 'Reviewed', 'Archived'].includes(a.status));
    if (overdue.length >= 3) {
      recs.push({
        audience: 'madam',
        trigger: `${overdue.length} SOP assignments are overdue`,
        why: 'Overdue procedures can point to workload pressure or unclear priorities.',
        action: 'Review outstanding assignments and reassign or extend deadlines where needed.',
        priority: overdue.length >= 6 ? 'high' : 'medium',
      });
    }

    // --- Madam-level: repeated exception categories ---
    const byCategory = {};
    exceptions.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    });
    Object.entries(byCategory).forEach(([cat, count]) => {
      if (count < 3) return;
      const phrasing = {
        'Material Shortage': 'Consider setting a minimum stock level for the affected materials.',
        'Resource Shortage': 'Review resource planning ahead of production peaks.',
        'Equipment Problem': 'Consider scheduling equipment maintenance or a backup plan.',
        'Staff Absence': 'Review staffing cover for busy periods.',
        'Training / Skill Gap': 'Consider assigning related training to close this gap.',
        'Process Problem': 'Review the relevant SOP — the process itself may need adjusting.',
        'Human Error': 'Review the relevant SOP with the team; consider a refresher.',
        'Missing Information': 'Check that intake forms capture the information staff need.',
        'Customer-Related Issue': 'Review the customer communication SOP for this scenario.',
      }[cat] || 'Review this recurring issue with the team.';
      recs.push({
        audience: 'madam',
        trigger: `"${cat}" has been reported ${count} times`,
        why: 'The same exception recurring points to a pattern rather than a one-off.',
        action: phrasing,
        priority: count >= 5 ? 'high' : 'medium',
      });
    });

    if (recs.filter(r => r.audience === 'madam').length === 0) {
      recs.push({ audience: 'madam', trigger: 'Not enough SOP data yet', why: 'Recommendations need a pattern across several assignments or exceptions before they are reliable.', action: 'Keep assigning and completing SOPs — insights will appear here as data builds up.', priority: 'info' });
    }

    // --- Staff / Trainee: my open + overdue assignments ---
    const mine = assignments.filter(a => a.assigned_to === user.id);
    const myOpen = mine.filter(a => !['Completed', 'Compliant', 'Reviewed', 'Archived'].includes(a.status));
    const myOverdue = myOpen.filter(a => a.due_date && new Date(a.due_date) < now);
    myOverdue.forEach(a => {
      recs.push({
        audience: 'staff',
        trigger: `"${a.sop_title_snapshot || sopMap[a.sop_id]?.title || 'A procedure'}" is overdue`,
        why: `It was due ${Math.abs(daysBetween(now, a.due_date))} day(s) ago.`,
        action: 'Complete this procedure or flag a blocker so it can be reassigned.',
        related: a.sop_title_snapshot,
        priority: 'high',
      });
    });
    const myExceptions = exceptions.filter(e => e.reported_by === user.id && e.status === 'Open');
    if (myExceptions.length > 0) {
      recs.push({
        audience: 'staff',
        trigger: `${myExceptions.length} exception(s) you reported are still open`,
        why: 'Unresolved exceptions can delay the order they relate to.',
        action: 'Follow up or escalate if it is blocking progress.',
        priority: 'medium',
      });
    }
    if (myOpen.length === 0 && myExceptions.length === 0) {
      recs.push({ audience: 'staff', trigger: 'No open SOPs assigned to you', why: 'Nothing outstanding right now.', action: 'Check "My SOPs" later for new assignments.', priority: 'info' });
    }

    // --- Trainer: trainee performance patterns ---
    const traineeAssignments = assignments.filter(a => a.role_context === 'Trainee');
    const byTrainee = {};
    traineeAssignments.forEach(a => {
      if (!byTrainee[a.assigned_to]) byTrainee[a.assigned_to] = [];
      byTrainee[a.assigned_to].push(a);
    });
    Object.entries(byTrainee).forEach(([traineeId, list]) => {
      if (list.length < 3) return;
      const completed = list.filter(a => ['Completed', 'Compliant', 'Reviewed'].includes(a.status));
      const rate = completed.length / list.length;
      if (rate >= 0.8) {
        recs.push({ audience: 'trainer', trigger: `A trainee has completed ${completed.length}/${list.length} assigned SOPs successfully`, why: 'Consistent success across several SOPs suggests readiness to progress.', action: 'Consider the next competency assessment for this trainee.', priority: 'medium', traineeId });
      } else if (rate <= 0.4) {
        recs.push({ audience: 'trainer', trigger: `A trainee has struggled with ${list.length - completed.length}/${list.length} assigned SOPs`, why: 'Repeated difficulty across SOPs suggests a skill gap rather than one-off mistakes.', action: 'Review with the trainee one-to-one and consider additional practice.', priority: 'high', traineeId });
      }
    });
    if (Object.keys(byTrainee).length === 0) {
      recs.push({ audience: 'trainer', trigger: 'Not enough trainee SOP data yet', why: 'Assign SOPs to trainees to start building performance insights.', action: 'Assign a training-related SOP to a trainee.', priority: 'info' });
    }

    return Response.json({ recommendations: recs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}