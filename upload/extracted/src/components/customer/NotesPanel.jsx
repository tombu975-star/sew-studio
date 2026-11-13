import React from 'react';
import { StickyNote } from 'lucide-react';
import { formatDate } from '@/lib/format';

export default function NotesPanel({ notes, uMap }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4]"><h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2"><StickyNote className="w-3.5 h-3.5" /> Internal Notes</h3></div>
      <div className="p-5">
        {notes.length === 0 ? <p className="text-sm text-stone-400">No internal notes yet.</p> : (
          <div className="space-y-3">
            {notes.map(n => (
              <div key={n.id} className="border-b border-[#E7E5E4] pb-3 last:border-0 last:pb-0">
                <p className="text-sm text-stone-600 whitespace-pre-wrap">{n.note}</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  {uMap[n.added_by]?.full_name || uMap[n.added_by]?.email || 'Staff'} · {formatDate(n.date)}
                  {n.edited_by && <> · edited by {uMap[n.edited_by]?.full_name || uMap[n.edited_by]?.email} on {formatDate(n.last_edited_date)}</>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}