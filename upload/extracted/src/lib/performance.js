export const SKILL_SCORE = { Beginner: 1, Practicing: 2, Confident: 3 };

// logs: TrainingLog records for one trainee, any order
export function computePerformance(logs) {
  const scored = (logs || []).filter(l => l.skill_level && l.date).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (scored.length === 0) return { score: null, label: 'No sessions yet', trend: null };

  const avg = scored.reduce((s, l) => s + (SKILL_SCORE[l.skill_level] || 0), 0) / scored.length;

  let trend = null;
  if (scored.length >= 2) {
    const recent = scored.slice(-3);
    const earlier = scored.slice(0, Math.max(1, scored.length - 3));
    const recentAvg = recent.reduce((s, l) => s + SKILL_SCORE[l.skill_level], 0) / recent.length;
    const earlierAvg = earlier.reduce((s, l) => s + SKILL_SCORE[l.skill_level], 0) / earlier.length;
    trend = recentAvg > earlierAvg ? 'up' : recentAvg < earlierAvg ? 'down' : 'flat';
  }

  const label = avg >= 2.5 ? 'Confident' : avg >= 1.5 ? 'Practicing' : 'Beginner';
  return { score: avg, label, trend };
}