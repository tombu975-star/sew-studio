import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';

export default function TrendSuggestions({ popularGarments }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await base44.functions.invoke('rtwTrendSuggestions', { popular_garments: popularGarments });
      setSuggestions(res.data?.suggestions || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AtelierCard
      title="RTW Trend Suggestions"
      action={
        <Button onClick={load} disabled={loading} variant="outline" className="rounded-sm h-7 px-2.5 text-[11px] gap-1.5">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> {suggestions ? 'Refresh' : 'Get Suggestions'}
        </Button>
      }
    >
      {!suggestions && !loading && !error && (
        <p className="text-sm text-stone-400 py-6 text-center">Get seasonal and festive ready-to-wear ideas based on trends and what the studio makes well.</p>
      )}
      {loading && <p className="text-sm text-stone-400 py-6 text-center">Checking current trends and upcoming occasions…</p>}
      {error && <p className="text-sm text-stone-400 py-6 text-center">Couldn't fetch suggestions — try again.</p>}
      {suggestions && suggestions.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {suggestions.map((s, i) => (
            <div key={i} className="border border-[#E7E5E4] rounded-sm p-3.5">
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#800020] mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-[#1C1917] leading-snug">{s.title}</p>
              </div>
              <p className="text-[11px] text-[#800020] font-medium mt-1.5">{s.occasion}</p>
              <p className="text-xs text-stone-500 mt-1.5 leading-snug">{s.note}</p>
            </div>
          ))}
        </div>
      )}
    </AtelierCard>
  );
}