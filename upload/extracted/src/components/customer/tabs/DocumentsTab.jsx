import React, { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import DocumentDialog from '@/components/customer/DocumentDialog';

export default function DocumentsTab({ documents, customerId, userId, onReload }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Documents</h3>
        <Button size="sm" className="gap-1.5 rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Upload</Button>
      </div>
      <div className="p-5">
        {documents.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No documents uploaded yet.</p> : (
          <div className="divide-y divide-[#E7E5E4]">
            {documents.map(d => (
              <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-between py-3 group">
                <div>
                  <p className="text-sm font-medium text-[#1C1917] group-hover:text-[#800020]">{d.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{d.category} · {formatDate(d.date)}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <DocumentDialog open={open} onOpenChange={setOpen} customerId={customerId} uploadedBy={userId} onSaved={onReload} />
    </div>
  );
}