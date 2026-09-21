import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import PortfolioDialog from '@/components/portfolio/PortfolioDialog';

const CATEGORY_STYLES = {
  'Bridal': 'bg-stone-100 text-stone-600 border-stone-200',
  'Evening Wear': 'bg-[#800020]/10 text-[#800020] border-[#800020]/30',
  'Traditional': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ready-to-Wear': 'bg-teal-50 text-teal-700 border-teal-200',
  'Accessories': 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function Portfolio() {
  const [items, setItems] = useState(null);
  const [dialog, setDialog] = useState(false);

  const load = () => base44.entities.PortfolioItem.list('-completed_date', 200).then(setItems).catch(console.error);
  useEffect(() => { load(); }, []);

  const addPiece = async (data) => {
    await base44.entities.PortfolioItem.create(data);
    setDialog(false);
    load();
  };
  const remove = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from the portfolio?`)) return;
    await base44.entities.PortfolioItem.delete(item.id);
    load();
  };

  return (
    <div className="p-5 md:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2">The Atelier's Work</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>Portfolio</h1>
          <p className="text-sm text-stone-500 mt-2">Finished pieces — a record of the studio's best work.</p>
        </div>
        <Button onClick={() => setDialog(true)} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5 self-start md:self-auto"><Plus className="w-4 h-4" /> Add Piece</Button>
      </div>

      {items === null ? (
        <p className="text-stone-400 text-sm">Loading portfolio…</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-sm p-10 text-center">
          <p className="text-sm text-stone-400">No pieces yet — photograph a finished garment and add it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-[#E7E5E4] rounded-sm overflow-hidden group">
              <div className="relative aspect-[3/4] bg-[#F3F1EF]">
                {item.image_url ? (
                  <Image src={item.image_url} className="w-full h-full" fittingType="fill" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-2"><ImageIcon className="w-8 h-8" /><span className="text-[10px]">No photo</span></div>
                )}
                <button onClick={() => remove(item)} title="Remove piece" className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-stone-400 hover:text-[#800020] opacity-0 group-hover:opacity-100 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3.5">
                <p className="text-sm font-medium text-[#1C1917] truncate">{item.title}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  {item.category && (
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border rounded-sm ${CATEGORY_STYLES[item.category] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>{item.category}</span>
                  )}
                  <div className="flex items-center gap-1.5">
                    {item.added_by_trainee && <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border rounded-sm bg-teal-50 text-teal-700 border-teal-200" title="Added by the trainee themselves">Added by trainee</span>}
                    <span className="text-[10px] text-stone-400">{formatDate(item.completed_date)}</span>
                  </div>
                </div>
                {item.description && <p className="text-[11px] text-stone-400 mt-2 line-clamp-2">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <PortfolioDialog open={dialog} onClose={() => setDialog(false)} onSave={addPiece} />
    </div>
  );
}