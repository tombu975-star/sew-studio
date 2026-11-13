import React from 'react';
import { shortDate } from '@/lib/format';
import { Image } from '@/components/ui/image';

export default function FeedbackEntries({ entries, emptyLabel }) {
  if (!entries.length) {
    return <p className="text-xs text-stone-300 py-4 text-center">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto pr-0.5">
      {entries.map(e => (
        <div key={e.id} className="bg-[#FBF9F7] border border-[#EDEBE9] rounded-sm p-2.5">
          <p className="text-xs text-[#1C1917] leading-snug">{e.text}</p>
          {e.image_url && (
            <Image src={e.image_url} className="w-full h-32 rounded-sm mt-2" fittingType="fill" />
          )}
          <p className="text-[10px] text-stone-400 mt-1">{e.authorName || 'Studio'} · {shortDate(e.date)}</p>
        </div>
      ))}
    </div>
  );
}