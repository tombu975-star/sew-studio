import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import MetricCard from '@/components/MetricCard';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';

const CLOSED = ['Completed', 'Compliant', 'Reviewed', 'Archived'];
const NEEDS_REVIEW = ['Completed', 'Evidence Submitted'];

export default function TeamComplianceTab({ sops, assignments, setAssignments, users, isTrainer }) {
  const [filterUser, setFilterUser] = useState('all');
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const scoped = isTrainer ? assignments.filter(a => a.role_context === 'Trainee') : assignments;

  const now = new Date();
  const overdue = scoped.filter(a => a.due_date && new Date(a.due_date) < now && !CLOSED.includes(a.status));
  const closedCount = scoped.filter(a => CLOSED.includes(a.status)).length;
  const incomplete = scoped.filter(a => ['Incomplete', 'Returned', 'Exception', 'Escalated'].includes(a.status));
  const complianceRate = scoped.length > 0 ? Math.round((closedCount / scoped.length) * 100) : null;
  const needsReview = scoped.filter(a => NEEDS_REVIEW.includes(a.status));
  const activeSops = sops.filter(s => s.status === 'Active').length;
  const reviewDue = sops.filter(s => s.review_date && new Date(s.review_date) < now && s.status === 'Active');

  const filtered = filterUser === 'all' ? scoped : scoped.filter(a => a.assigned_to === filterUser);
  const sorted = filtered.slice().sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));

  const review = async (assignment, status) => {
    const updated = await base44.entities.SOPAssignment.update(assignment.id, {
      status,
      reviewed_date: new Date().toISOString().slice(0, 10),
    });
    setAssignments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Active SOPs" value={activeSops} />
        <MetricCard label="Assigned" value={scoped.length} />
        <MetricCard label="Completed" value={closedCount} accent />
        <MetricCard label="Overdue" value={overdue.length} />
        <MetricCard label="Compliance Rate" value={complianceRate !== null ? `${complianceRate}%` : '—'} accent />
        <MetricCard label="Incomplete / Exception" value={incomplete.length} />
        <MetricCard label="Awaiting Review" value={needsReview.length} />
        <MetricCard label="SOPs Due For Review" value={reviewDue.length} />
      </div>

      <AtelierCard title="Assignments" action={
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="text-[11px] border border-[#E7E5E4] rounded-sm px-2 py-1">
          <option value="all">Everyone</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
      }>
        {sorted.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No assignments yet.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {sorted.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1917] truncate">{a.sop_title_snapshot}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{userMap[a.assigned_to]?.full_name || userMap[a.assigned_to]?.email || 'Unknown'} · {a.due_date ? `Due ${a.due_date}` : 'No due date'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={a.status} />
                  {NEEDS_REVIEW.includes(a.status) && (
                    <>
                      <Button size="sm" onClick={() => review(a, 'Compliant')} className="h-6 text-[10px] rounded-sm bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => review(a, 'Returned')} className="h-6 text-[10px] rounded-sm">Return</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AtelierCard>
    </div>
  );
}