import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import ChecklistRunner from './ChecklistRunner';

function Row({ assignment, currentUser, onUpdated }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <p className="text-sm font-medium text-[#1C1917]">{assignment.sop_title_snapshot}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">{assignment.due_date ? `Due ${assignment.due_date}` : 'No due date'}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={assignment.status} />
          {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </button>
      {open && <ChecklistRunner assignment={assignment} currentUser={currentUser} onUpdated={onUpdated} />}
    </div>
  );
}

export default function MySOPsTab({ assignments, setAssignments, currentUser }) {
  const mine = assignments.filter(a => a.assigned_to === currentUser?.id).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  const open = mine.filter(a => !['Completed', 'Compliant', 'Reviewed', 'Archived'].includes(a.status));
  const closed = mine.filter(a => ['Completed', 'Compliant', 'Reviewed', 'Archived'].includes(a.status));

  const handleUpdated = (updated) => {
    setAssignments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
  };

  if (mine.length === 0) {
    return <p className="text-sm text-stone-400 py-10 text-center">No SOPs assigned to you yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Outstanding ({open.length})</p>
        {open.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">Nothing outstanding right now.</p>
        ) : (
          <div className="space-y-2">{open.map(a => <Row key={a.id} assignment={a} currentUser={currentUser} onUpdated={handleUpdated} />)}</div>
        )}
      </div>
      {closed.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Completed ({closed.length})</p>
          <div className="space-y-2">{closed.map(a => <Row key={a.id} assignment={a} currentUser={currentUser} onUpdated={handleUpdated} />)}</div>
        </div>
      )}
    </div>
  );
}