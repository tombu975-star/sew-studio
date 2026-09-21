import React from 'react';
import { cn } from '@/lib/utils';
import { ORDER_STATUSES } from '@/lib/format';

export default function StatusStepper({ current, className }) {
  const idx = ORDER_STATUSES.indexOf(current);
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {ORDER_STATUSES.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={cn(
                  'w-2.5 h-2.5 rounded-full border',
                  done && 'bg-[#800020] border-[#800020]',
                  active && 'bg-[#B45309] border-[#B45309] ring-4 ring-[#B45309]/15',
                  !done && !active && 'bg-white border-stone-300'
                )} />
                <span className={cn(
                  'text-[9px] leading-tight text-center w-14 font-medium',
                  active ? 'text-[#B45309]' : done ? 'text-[#1C1917]' : 'text-stone-400'
                )}>
                  {s}
                </span>
              </div>
              {i < ORDER_STATUSES.length - 1 && (
                <div className={cn('flex-1 h-px mx-1 mb-4', i < idx ? 'bg-[#800020]' : 'bg-stone-200')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}