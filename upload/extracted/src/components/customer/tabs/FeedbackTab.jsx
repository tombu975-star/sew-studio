import React, { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import FeedbackDialog from '@/components/customer/FeedbackDialog';

export default function FeedbackTab({ feedback, customerId, staffId, onReload }) {
  const [open, setOpen] = useState(false);
  const rated = feedback.filter(f => f.rating);
  const avg = rated.length ? rated.reduce((s, f) => s + Number(f.rating), 0) / rated.length : null;

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2"><Star className="w-3.5 h-3.5" /> Feedback & Experience {avg != null && `· ${avg.toFixed(1)}/5 avg (${rated.length} reviews)`}</h3>
        <Button size="sm" className="gap-1.5 rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Add</Button>
      </div>
      <div className="p-5">
        {feedback.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No feedback recorded yet.</p> : (
          <div className="space-y-3">
            {feedback.map(f => (
              <div key={f.id} className="border-b border-[#E7E5E4] pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-[#1C1917]">{f.type}{f.rating ? ` · ${f.rating}/5` : ''} · {formatDate(f.date)}</p>
                {f.feedback && <p className="text-sm text-stone-600 mt-1">{f.feedback}</p>}
                {f.resolution && <p className="text-xs text-stone-400 mt-1">Resolution: {f.resolution}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <FeedbackDialog open={open} onOpenChange={setOpen} customerId={customerId} staffId={staffId} onSaved={onReload} />
    </div>
  );
}