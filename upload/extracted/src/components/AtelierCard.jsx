import React from 'react';
import { cn } from '@/lib/utils';

export default function AtelierCard({ title, action, className, children, bodyClassName }) {
  return (
    <div className={cn('bg-white border border-[#E7E5E4] rounded-sm', className)}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E7E5E4]">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{title}</h3>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </div>
  );
}