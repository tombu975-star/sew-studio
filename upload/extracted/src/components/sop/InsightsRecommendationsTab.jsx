import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';

const PRIORITY_STYLE = { high: 'border-l-2 border-red-400', medium: 'border-l-2 border-amber-400', info: 'border-l-2 border-stone-300' };

function RecCard({ rec }) {
  return (
    <div className={`bg-white border border-[#E7E5E4] rounded-sm p-4 ${PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE.info}`}>
      <p className="text-sm font-medium text-[#1C1917]">{rec.trigger}</p>
      {rec.why && <p className="text-xs text-stone-500 mt-1.5"><span className="font-semibold text-stone-600">Why it matters: </span>{rec.why}</p>}
      {rec.action && <p className="text-xs text-[#800020] mt-1.5 font-medium">{rec.action}</p>}
      {rec.related && <p className="text-[11px] text-stone-400 mt-1">Related: {rec.related}</p>}
    </div>
  );
}

export default function InsightsRecommendationsTab({ role, sops, exceptions, isTrainer }) {
  const [recs, setRecs] = useState(null);

  useEffect(() => {
    base44.functions.invoke('sopRecommendations', {}).then(res => setRecs(res.data?.recommendations || [])).catch(() => setRecs([]));
  }, []);

  const audience = role === 'madam' ? 'madam' : isTrainer ? 'trainer' : 'staff';
  const mine = (recs || []).filter(r => r.audience === audience);

  const insights = useMemo(() => {
    const byCategory = {};
    exceptions.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + 1; });
    const commonExceptions = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const reviewDue = sops.filter(s => s.review_date && new Date(s.review_date) < new Date() && s.status === 'Active');
    return { commonExceptions, reviewDue };
  }, [sops, exceptions]);

  return (
    <div className="space-y-5">
      <AtelierCard title="Recommendations" action={<Sparkles className="w-4 h-4 text-[#800020]" />}>
        {recs === null ? (
          <p className="text-sm text-stone-400 py-6 text-center">Loading recommendations…</p>
        ) : mine.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">Not enough SOP data yet to generate recommendations.</p>
        ) : (
          <div className="space-y-2.5">{mine.map((r, i) => <RecCard key={i} rec={r} />)}</div>
        )}
      </AtelierCard>

      {role === 'madam' && (
        <AtelierCard title="SOP Insights">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-2">Most Common Exceptions</p>
              {insights.commonExceptions.length === 0 ? (
                <p className="text-xs text-stone-400 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> No exceptions logged yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {insights.commonExceptions.map(([cat, count]) => (
                    <span key={cat} className="text-[11px] text-stone-600 bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm px-2 py-1">{cat} · {count}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-2">SOPs Needing Review</p>
              {insights.reviewDue.length === 0 ? (
                <p className="text-xs text-stone-400">Nothing overdue for review.</p>
              ) : (
                <ul className="text-xs text-[#1C1917] space-y-1">
                  {insights.reviewDue.map(s => <li key={s.id}>{s.title} — review was due {s.review_date}</li>)}
                </ul>
              )}
            </div>
          </div>
        </AtelierCard>
      )}
    </div>
  );
}