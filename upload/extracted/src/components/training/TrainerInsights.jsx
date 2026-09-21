import React from 'react';
import { ClipboardCheck, AlertTriangle, TrendingDown, Sparkles } from 'lucide-react';

// Teaching recommendations for the Trainer role: who needs help, skill gaps,
// training to assign next, and progress concerns — built from data already
// computed in MyTrainees (no extra fetching).
export default function TrainerInsights({ rows, pendingCount, pendingNames }) {
  const messages = [];

  if (pendingCount > 0) {
    messages.push({
      icon: ClipboardCheck,
      text: `${pendingCount} submission${pendingCount !== 1 ? 's' : ''} awaiting your feedback: ${pendingNames.join(', ')}.`,
    });
  }

  const stale = rows.filter(r => r.stale);
  if (stale.length > 0) {
    const names = stale.map(r => r.t.name);
    messages.push({
      icon: AlertTriangle,
      text: `${names.length === 1 ? `${names[0]} hasn't` : `${names.join(', ')} haven't`} had a session in over 2 weeks — consider scheduling a check-in.`,
    });
  }

  const decliningOrStruggling = rows.filter(r => r.performance?.trend === 'down' || (r.performance?.label === 'Beginner' && r.performance?.score !== null));
  decliningOrStruggling.forEach(r => {
    messages.push({
      icon: TrendingDown,
      text: r.performance.trend === 'down'
        ? `${r.t.name}'s skill trend is dipping — worth revisiting recent lessons with them.`
        : `${r.t.name} is still at Beginner level — may need extra support before moving on.`,
    });
  });

  const readyToAdvance = rows.filter(r => r.performance?.label === 'Confident' && r.recommended);
  readyToAdvance.forEach(r => {
    messages.push({
      icon: Sparkles,
      text: `${r.t.name} looks confident in their current work — ready to assign "${r.recommended.name}" next.`,
    });
  });

  if (messages.length === 0) return null;

  return (
    <div className="mb-4 md:mb-5 space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-3">Teaching Recommendations</h2>
      {messages.map((m, i) => (
        <div key={i} className="bg-white border border-[#E7E5E4] rounded-sm p-4 flex items-start gap-3">
          <m.icon className="w-4 h-4 text-[#800020] mt-0.5 shrink-0" />
          <p className="text-sm text-[#1C1917] leading-snug">{m.text}</p>
        </div>
      ))}
    </div>
  );
}