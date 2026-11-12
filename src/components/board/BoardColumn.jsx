import React from 'react';

export default function BoardColumn({ title, count, children }) {
  return (
    <div className="flex flex-col w-full min-w-0">
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">{title}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-[#E7E5E4] text-stone-500">{count}</span>
      </div>
      <div className="flex-1 flex flex-col gap-2 bg-[#FBF9F7] border border-[#EDEBE9] rounded-sm p-2 min-h-[160px] min-w-0 overflow-hidden">
        {count === 0 ? (
          <p className="text-[11px] text-stone-300 text-center py-6">No orders</p>
        ) : children}
      </div>
    </div>
  );
}