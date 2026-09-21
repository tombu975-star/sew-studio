import React from 'react';
import { Trophy } from 'lucide-react';
import AtelierCard from '@/components/AtelierCard';

export default function StaffLeaderboard({ rows }) {
  const sorted = [...rows].sort((a, b) => (b.completedOrders + b.completedTasks) - (a.completedOrders + a.completedTasks));

  return (
    <AtelierCard title="Staff Leaderboard — This Month">
      {sorted.length === 0 ? (
        <p className="text-sm text-stone-400 py-6 text-center">No staff members yet.</p>
      ) : (
        <div className="divide-y divide-[#E7E5E4]">
          {sorted.map(({ user: u, completedOrders, completedTasks }, i) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <div className="w-6 text-center shrink-0">
                {i === 0 ? <Trophy className="w-4 h-4 text-amber-500 mx-auto" /> : <span className="text-xs text-stone-400 font-medium">{i + 1}</span>}
              </div>
              <div className="w-9 h-9 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center text-xs font-semibold text-[#800020] shrink-0">
                {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1C1917] truncate">{u.full_name || u.email}</p>
                <p className="text-[11px] text-stone-400">{completedOrders} order{completedOrders !== 1 ? 's' : ''} · {completedTasks} task{completedTasks !== 1 ? 's' : ''} completed</p>
              </div>
              <span className="inline-flex items-center justify-center min-w-7 h-6 px-2 text-[11px] font-semibold text-[#800020] bg-[#800020]/10 rounded-full">{completedOrders + completedTasks}</span>
            </div>
          ))}
        </div>
      )}
    </AtelierCard>
  );
}