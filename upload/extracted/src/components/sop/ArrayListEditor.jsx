import React from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ArrayListEditor({ label, items, onChange, placeholder }) {
  const update = (i, val) => onChange(items.map((s, idx) => idx === i ? val : s));
  const add = () => onChange([...items, '']);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      {items.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-xs text-stone-400 w-4">{i + 1}.</span>
          <Input value={s} onChange={e => update(i, e.target.value)} placeholder={placeholder || `${label} ${i + 1}`} className="text-sm" />
          <button type="button" onClick={() => remove(i)} className="text-stone-400 hover:text-stone-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="h-7 text-[11px] rounded-sm gap-1">
        <Plus className="w-3 h-3" /> Add {label.replace(/s$/, '')}
      </Button>
    </div>
  );
}