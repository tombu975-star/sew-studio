import React, { useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import CommunicationDialog from '@/components/customer/CommunicationDialog';

export default function CommunicationsTab({ communications, customerId, staffId, uMap, onReload }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Communication History</h3>
        <Button size="sm" className="gap-1.5 rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Log</Button>
      </div>
      <div className="p-5">
        {communications.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No communications logged yet.</p> : (
          <div className="space-y-3">
            {communications.map(c => (
              <div key={c.id} className="border-b border-[#E7E5E4] pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-[#1C1917]">{formatDate(c.date)} — {c.type}</p>
                <p className="text-sm text-stone-600 mt-0.5">{c.summary}</p>
                {c.staff_id && uMap[c.staff_id] && <p className="text-[11px] text-stone-400 mt-1">{uMap[c.staff_id].full_name || uMap[c.staff_id].email}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <CommunicationDialog open={open} onOpenChange={setOpen} customerId={customerId} staffId={staffId} onSaved={onReload} />
    </div>
  );
}