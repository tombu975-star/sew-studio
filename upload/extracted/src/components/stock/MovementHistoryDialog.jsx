import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, formatCurrency } from '@/lib/format';

const TYPE_STYLES = {
  'Stock In': 'bg-[#F0F5F0] text-[#1B5E20]',
  'Stock Out': 'bg-[#FBF4F2] text-[#800020]',
  'Adjustment': 'bg-stone-100 text-stone-500',
};

export default function MovementHistoryDialog({ open, onOpenChange, item, movements }) {
  if (!item) return null;
  const history = movements
    .filter(m => m.item_id === item.id)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Ledger — {item.name}</DialogTitle>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No movements recorded yet.</p>
        ) : (
          <div className="divide-y divide-[#F0EEEC] max-h-[50vh] overflow-y-auto">
            {history.map(m => (
              <div key={m.id} className="flex items-start gap-3 py-3">
                <span className={`text-[10px] uppercase tracking-wider rounded-sm px-1.5 py-0.5 shrink-0 ${TYPE_STYLES[m.type] || TYPE_STYLES['Adjustment']}`}>{m.type}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1C1917]">
                    {m.quantity} {item.unit.toLowerCase()}
                    {m.unit_cost ? <span className="text-stone-400"> · {formatCurrency(m.unit_cost)}/unit</span> : null}
                    {m.type === 'Stock Out' ? <span className="text-stone-400"> taken off</span> : m.type === 'Stock In' ? <span className="text-stone-400"> added</span> : null}
                  </p>
                  {m.note && <p className="text-xs text-stone-400 mt-0.5">{m.note}</p>}
                </div>
                <span className="text-[11px] text-stone-400 shrink-0">{formatDate(m.date)}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}