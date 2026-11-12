import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import AtelierCard from '@/components/AtelierCard';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import PortfolioReviewDialog from './PortfolioReviewDialog';

export default function SubmissionsToReview({ items, traineeMap, onSaveReview }) {
  const [reviewing, setReviewing] = useState(null);

  const save = async (id, data) => { await onSaveReview(id, data); setReviewing(null); };

  if (items.length === 0) return null;

  return (
    <AtelierCard title={`Submissions to Review (${items.length})`}>
      <div className="divide-y divide-[#E7E5E4]">
        {items.map(item => (
          <div key={item.id} className="py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#F3F1EF] overflow-hidden shrink-0">
              {item.image_url && <Image src={item.image_url} className="w-full h-full" fittingType="fill" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1C1917] truncate">{item.title}</p>
              <p className="text-[11px] text-stone-400">{traineeMap[item.trainee_id]?.name || 'Trainee'}</p>
            </div>
            <Button onClick={() => setReviewing(item)} variant="outline" size="sm" className="gap-1.5 rounded-sm shrink-0"><ClipboardCheck className="w-3.5 h-3.5" /> Review</Button>
          </div>
        ))}
      </div>
      <PortfolioReviewDialog open={!!reviewing} item={reviewing} onClose={() => setReviewing(null)} onSave={save} />
    </AtelierCard>
  );
}