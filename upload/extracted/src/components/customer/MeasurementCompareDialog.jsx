import React, { useState, useMemo } from 'react';
import { formatDate } from '@/lib/format';
import { compareMeasurementSets } from '@/lib/proportions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function MeasurementCompareDialog({ open, onOpenChange, sets, initialId }) {
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState(initialId || '');

  const a = sets.find(s => s.id === aId);
  const b = sets.find(s => s.id === bId);
  const changes = useMemo(() => (a && b ? compareMeasurementSets(a, b) : []), [a, b]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Compare Measurement Sets</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select value={aId} onValueChange={setAId}>
            <SelectTrigger className="rounded-sm"><SelectValue placeholder="Earlier set" /></SelectTrigger>
            <SelectContent>{sets.map(s => <SelectItem key={s.id} value={s.id}>{s.set_name} · {formatDate(s.date_taken)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={bId} onValueChange={setBId}>
            <SelectTrigger className="rounded-sm"><SelectValue placeholder="Later set" /></SelectTrigger>
            <SelectContent>{sets.map(s => <SelectItem key={s.id} value={s.id}>{s.set_name} · {formatDate(s.date_taken)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {a && b ? (
          changes.length === 0 ? <p className="text-sm text-stone-400">No numeric differences between these two sets.</p> : (
            <div className="divide-y divide-[#E7E5E4]">
              {changes.map(c => (
                <div key={c.key} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-stone-500 capitalize">{c.key.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-[#1C1917]">{c.from} → {c.to} <span className={c.direction === 'increased' ? 'text-[#B45309]' : 'text-[#15803D]'}>({c.direction} {Math.abs(c.diff)})</span></span>
                </div>
              ))}
            </div>
          )
        ) : <p className="text-sm text-stone-400">Choose two measurement sets to compare.</p>}
      </DialogContent>
    </Dialog>
  );
}