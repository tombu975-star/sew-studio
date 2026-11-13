import React, { useState } from 'react';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import ExceptionDialog from './ExceptionDialog';

export default function ChecklistRunner({ assignment, currentUser, onUpdated }) {
  const items = assignment.checklist_snapshot?.length ? assignment.checklist_snapshot : [];
  const progress = items.map((item, i) => assignment.checklist_progress?.[i] || { item, checked: false });
  const [notes, setNotes] = useState(assignment.notes || '');
  const [uploading, setUploading] = useState(false);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const done = items.length > 0 ? progress.every(p => p.checked) : true;

  const toggle = async (idx) => {
    const next = progress.map((p, i) => i === idx ? { ...p, checked: !p.checked } : p);
    const status = assignment.status === 'Assigned' ? 'Started' : assignment.status;
    const updated = await base44.entities.SOPAssignment.update(assignment.id, {
      checklist_progress: next,
      status,
      started_date: assignment.started_date || new Date().toISOString().slice(0, 10),
    });
    onUpdated(updated);
  };

  const saveNotes = async () => {
    const updated = await base44.entities.SOPAssignment.update(assignment.id, { notes });
    onUpdated(updated);
  };

  const uploadEvidence = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = await base44.entities.SOPAssignment.update(assignment.id, { evidence_urls: [...(assignment.evidence_urls || []), file_url] });
    setUploading(false);
    onUpdated(updated);
  };

  const complete = async () => {
    const updated = await base44.entities.SOPAssignment.update(assignment.id, {
      status: assignment.evidence_urls?.length ? 'Evidence Submitted' : 'Completed',
      completed_date: new Date().toISOString().slice(0, 10),
    });
    onUpdated(updated);
  };

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-[#E7E5E4] pt-3">
      {items.length > 0 && (
        <div className="space-y-1.5">
          {progress.map((p, i) => (
            <label key={i} className="flex items-start gap-2 text-xs text-[#1C1917]">
              <Checkbox checked={p.checked} onCheckedChange={() => toggle(i)} className="mt-0.5" />
              <span className={p.checked ? 'line-through text-stone-400' : ''}>{p.item}</span>
            </label>
          ))}
        </div>
      )}

      <Textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Notes about this run…" className="text-xs min-h-[50px]" />

      {assignment.evidence_urls?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignment.evidence_urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="text-[11px] text-[#800020] underline">Evidence {i + 1}</a>
          ))}
        </div>
      )}

      <div className="flex items-center flex-wrap gap-3">
        <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 border border-[#E7E5E4] rounded-sm px-2 py-1 cursor-pointer hover:bg-stone-50">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload evidence
          <input type="file" className="hidden" onChange={e => e.target.files[0] && uploadEvidence(e.target.files[0])} disabled={uploading} />
        </label>

        <button type="button" onClick={() => setExceptionOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:underline">
          <AlertTriangle className="w-3.5 h-3.5" /> Report a problem
        </button>

        {!['Completed', 'Evidence Submitted', 'Reviewed', 'Compliant', 'Archived'].includes(assignment.status) && (
          <Button disabled={!done} onClick={complete} size="sm" className="h-7 text-[11px] rounded-sm bg-[#800020] hover:bg-[#6b0018] ml-auto">
            Mark Complete
          </Button>
        )}
        <span className="ml-auto"><StatusBadge status={assignment.status} /></span>
      </div>

      <ExceptionDialog open={exceptionOpen} onOpenChange={setExceptionOpen} assignment={assignment} currentUser={currentUser} onReported={() => onUpdated({ ...assignment, status: 'Exception' })} />
    </div>
  );
}