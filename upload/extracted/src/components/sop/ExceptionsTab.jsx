import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const STATUS_STYLE = { Open: 'bg-amber-100 text-amber-700', Escalated: 'bg-red-100 text-red-700', Resolved: 'bg-emerald-100 text-emerald-700' };

export default function ExceptionsTab({ exceptions, setExceptions, canManage }) {
  const [resolving, setResolving] = useState(null);
  const [resolution, setResolution] = useState('');

  const byCategory = useMemo(() => {
    const m = {};
    exceptions.forEach(e => { m[e.category] = (m[e.category] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [exceptions]);

  const setStatus = async (exc, status) => {
    const updated = await base44.entities.SOPException.update(exc.id, { status, resolved_date: status === 'Resolved' ? new Date().toISOString().slice(0, 10) : undefined, resolution: status === 'Resolved' ? resolution : exc.resolution });
    setExceptions(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    setResolving(null);
    setResolution('');
  };

  const sorted = exceptions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="space-y-5">
      {byCategory.length > 0 && (
        <AtelierCard title="Most Common Categories">
          <div className="flex flex-wrap gap-2">
            {byCategory.map(([cat, count]) => (
              <span key={cat} className="text-[11px] text-stone-600 bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm px-2 py-1">{cat} · {count}</span>
            ))}
          </div>
        </AtelierCard>
      )}

      <AtelierCard title={`Reported Problems (${exceptions.length})`}>
        {sorted.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No problems reported yet.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {sorted.map(e => (
              <div key={e.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-stone-600">{e.category}</span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${STATUS_STYLE[e.status] || STATUS_STYLE.Open}`}>{e.status}</span>
                </div>
                <p className="text-sm text-[#1C1917] mt-1">{e.description}</p>
                <p className="text-[11px] text-stone-400 mt-1">{e.date}</p>
                {e.resolution && <p className="text-xs text-stone-500 mt-1"><span className="font-semibold">Resolution: </span>{e.resolution}</p>}
                {canManage && e.status !== 'Resolved' && (
                  <div className="mt-2">
                    {resolving === e.id ? (
                      <div className="space-y-1.5">
                        <Textarea value={resolution} onChange={ev => setResolution(ev.target.value)} placeholder="How was this resolved?" className="text-xs min-h-[40px]" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setStatus(e, 'Resolved')} className="h-6 text-[10px] rounded-sm bg-emerald-600 hover:bg-emerald-700">Save & Resolve</Button>
                          <Button size="sm" variant="outline" onClick={() => setResolving(null)} className="h-6 text-[10px] rounded-sm">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setResolving(e.id)} className="text-[11px] text-[#800020] hover:underline">Resolve</button>
                        {e.status !== 'Escalated' && <button type="button" onClick={() => setStatus(e, 'Escalated')} className="text-[11px] text-red-600 hover:underline">Escalate</button>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AtelierCard>
    </div>
  );
}