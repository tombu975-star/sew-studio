import React from 'react';
import { Image } from '@/components/ui/image';
import { shortDate } from '@/lib/format';

export default function CommentThread({ entries, currentUserId, emptyLabel }) {
  if (!entries.length) {
    return <p className="text-xs text-stone-300 py-4 text-center">{emptyLabel}</p>;
  }
  const ordered = [...entries].reverse(); // oldest first, chat-style
  return (
    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
      {ordered.map(e => {
        const isMine = e.author_id === currentUserId;
        return (
          <div key={e.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-sm p-2.5 ${isMine ? 'bg-[#800020]/10 border border-[#800020]/20' : 'bg-[#FBF9F7] border border-[#EDEBE9]'}`}>
              <p className="text-[10px] font-semibold text-stone-500">{e.authorName || 'Studio'}</p>
              <p className="text-xs text-[#1C1917] leading-snug mt-0.5 whitespace-pre-wrap">{e.text}</p>
              {e.image_url && (
                <Image src={e.image_url} className="w-full h-32 rounded-sm mt-2" fittingType="fill" />
              )}
              <p className="text-[10px] text-stone-400 mt-1">{shortDate(e.date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}