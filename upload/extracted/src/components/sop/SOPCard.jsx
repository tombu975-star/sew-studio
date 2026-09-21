import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2, Paperclip, Copy, UserPlus, Archive } from 'lucide-react';

const STATUS_STYLE = {
  Draft: 'bg-stone-100 text-stone-500',
  Active: 'bg-emerald-100 text-emerald-700',
  Archived: 'bg-stone-100 text-stone-400',
};

export default function SOPCard({ sop, canManage, onEdit, onDelete, onDuplicate, onAssign, onArchive }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1C1917] truncate">{sop.title}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{sop.category}{sop.responsible_role && sop.responsible_role !== 'Any' ? ` · ${sop.responsible_role}` : ''}</p>
          </div>
          {sop.is_template && <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-sm">Template</span>}
          <span className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${STATUS_STYLE[sop.status] || STATUS_STYLE.Draft}`}>{sop.status || 'Draft'}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          {(sop.purpose || sop.summary) && <p className="text-xs text-stone-500 leading-snug"><span className="font-semibold text-stone-600">Purpose: </span>{sop.purpose || sop.summary}</p>}
          {sop.when_to_use && <p className="text-xs text-stone-500 leading-snug"><span className="font-semibold text-stone-600">When: </span>{sop.when_to_use}</p>}
          {sop.steps?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Steps</p>
              <ol className="list-decimal list-inside space-y-1">
                {sop.steps.map((s, i) => <li key={i} className="text-xs text-[#1C1917] leading-snug">{s}</li>)}
              </ol>
            </div>
          )}
          {sop.checklist_items?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Checklist</p>
              <ul className="space-y-1">
                {sop.checklist_items.map((s, i) => <li key={i} className="text-xs text-[#1C1917] leading-snug flex gap-1.5"><span className="text-stone-400">☐</span>{s}</li>)}
              </ul>
            </div>
          )}
          {sop.common_problems && <p className="text-xs text-stone-500 leading-snug"><span className="font-semibold text-stone-600">Common problems: </span>{sop.common_problems}</p>}
          {sop.escalation_procedure && <p className="text-xs text-stone-500 leading-snug"><span className="font-semibold text-stone-600">Escalation: </span>{sop.escalation_procedure}</p>}
          {sop.attachment_url && (
            <a href={sop.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#800020] underline">
              <Paperclip className="w-3 h-3" /> View attachment
            </a>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            {onAssign && (
              <button type="button" onClick={() => onAssign(sop)} className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#800020]">
                <UserPlus className="w-3 h-3" /> Assign
              </button>
            )}
            {canManage && (
              <>
                <button type="button" onClick={() => onEdit(sop)} className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#800020]">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button type="button" onClick={() => onDuplicate(sop)} className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#800020]">
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                {sop.status !== 'Archived' && (
                  <button type="button" onClick={() => onArchive(sop)} className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-amber-700">
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                )}
                <button type="button" onClick={() => onDelete(sop)} className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-destructive">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}