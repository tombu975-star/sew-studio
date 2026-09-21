export const HEALTH_COLORS = { green: '#15803D', amber: '#B45309', red: '#800020', neutral: '#A8A29E' };

export const STATUS_COLORS = {
  'On Track': HEALTH_COLORS.green,
  'Needs Attention': HEALTH_COLORS.amber,
  'At Risk': HEALTH_COLORS.red,
};

// Score color: green above 70, amber 40-70, red below 40
export function scoreColor(score) {
  return score >= 70 ? HEALTH_COLORS.green : score >= 40 ? HEALTH_COLORS.amber : HEALTH_COLORS.red;
}

// Per-signal color, where the signal value is 0-20 points
export function signalColor(value) {
  if (value == null) return HEALTH_COLORS.neutral;
  return value >= 14 ? HEALTH_COLORS.green : value >= 8 ? HEALTH_COLORS.amber : HEALTH_COLORS.red;
}