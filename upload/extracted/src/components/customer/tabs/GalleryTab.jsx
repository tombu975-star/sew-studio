import React, { useState } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { Image as Img } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import GalleryDialog from '@/components/customer/GalleryDialog';

export default function GalleryTab({ items, customerId, userId, onReload }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> Design & Inspiration Gallery</h3>
        <Button size="sm" className="gap-1.5 rounded-sm bg-[#800020] hover:bg-[#6b0018] text-white" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Add</Button>
      </div>
      <div className="p-5">
        {items.length === 0 ? <p className="text-sm text-stone-400 py-6 text-center">No images yet.</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map(i => (
              <div key={i.id} className="border border-[#E7E5E4] rounded-sm overflow-hidden">
                <Img src={i.image_url} alt={i.title || 'Gallery item'} className="w-full h-32" fittingType="fill" />
                <div className="p-2">
                  <p className="text-xs font-medium text-[#1C1917] truncate">{i.title || i.category}</p>
                  <p className="text-[10px] text-stone-400">{i.approval_status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <GalleryDialog open={open} onOpenChange={setOpen} customerId={customerId} uploadedBy={userId} onSaved={onReload} />
    </div>
  );
}