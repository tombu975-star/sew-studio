import React, { useMemo } from 'react';
import AtelierCard from '@/components/AtelierCard';

export default function ClientSources({ customers }) {
  const counts = useMemo(() => {
    const map = {};
    customers.forEach(c => {
      const src = c.entry_source || 'Not recorded';
      map[src] = (map[src] || 0) + 1;
    });
    return map;
  }, [customers]);

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, n]) => n), 1);

  return (
    <AtelierCard title="Where Clients Come From" className="mb-5">
      <div className="space-y-2.5">
        {entries.map(([src, n]) => (
          <div key={src} className="flex items-center gap-3">
            <span className="text-xs text-stone-500 w-32 shrink-0">{src}</span>
            <div className="flex-1 h-1.5 bg-[#F0EEE9] rounded-full overflow-hidden">
              <div className="h-full bg-[#800020] rounded-full" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="text-xs font-medium text-[#1C1917] w-6 text-right">{n}</span>
          </div>
        ))}
      </div>
    </AtelierCard>
  );
}