import React, { useState } from 'react';
import { Plus, PenLine, BookOpen, Video } from 'lucide-react';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import CourseDialog from './CourseDialog';

export default function CurriculumManager({ courses, onSave }) {
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const sorted = [...courses].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));

  const openEdit = (c) => { setEditing(c); setDialog(true); };
  const openNew = () => { setEditing(null); setDialog(true); };
  const save = async (data, id) => { await onSave(data, id); setDialog(false); };

  return (
    <AtelierCard
      title="Curriculum"
      action={<Button onClick={openNew} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm gap-1.5 h-7 px-2.5 text-[11px]"><Plus className="w-3 h-3" /> Add Module</Button>}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-stone-400 py-6 text-center flex items-center justify-center gap-2"><BookOpen className="w-4 h-4" /> No skill modules set up yet.</p>
      ) : (
        <div className="divide-y divide-[#E7E5E4]">
          {sorted.map(c => (
            <div key={c.id} className="py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#1C1917]">{c.name}</p>
                {c.description && <p className="text-xs text-stone-500 mt-0.5">{c.description}</p>}
                {c.videos?.length > 0 && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#800020] font-medium">
                    <Video className="w-3 h-3" /> {c.videos.length} video{c.videos.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={() => openEdit(c)} className="text-stone-400 hover:text-[#800020] shrink-0"><PenLine className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <CourseDialog open={dialog} course={editing} onClose={() => setDialog(false)} onSave={save} />
    </AtelierCard>
  );
}