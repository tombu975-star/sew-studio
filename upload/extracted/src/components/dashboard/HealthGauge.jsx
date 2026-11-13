import React from 'react';

export default function HealthGauge({ score, color }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 140 140" className="w-40 h-40">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F3F1EF" strokeWidth="11" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 70 70)"
        />
        <text x="70" y="68" textAnchor="middle" style={{ fontSize: 36, fontWeight: 600, fill: '#1C1917', fontFamily: 'var(--font-display)' }}>{score}</text>
        <text x="70" y="88" textAnchor="middle" style={{ fontSize: 9, fill: '#A8A29E', letterSpacing: '0.18em' }}>OUT OF 100</text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{score >= 70 ? 'On Track' : score >= 40 ? 'Needs Attention' : 'At Risk'}</span>
    </div>
  );
}