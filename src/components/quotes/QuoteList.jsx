import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AtelierCard from '@/components/AtelierCard';
import { formatCurrency, formatDate } from '@/lib/format';

const STATUS_STYLES = {
  Draft: 'bg-stone-50 text-stone-500 border-stone-200',
  Sent: 'bg-blue-50 text-blue-700 border-blue-200',
  Accepted: 'bg-green-50 text-[#15803D] border-green-200',
  Declined: 'bg-red-50 text-red-600 border-red-200',
  Converted: 'bg-[#800020]/10 text-[#800020] border-[#800020]/20',
};

const smallAction = 'h-7 px-2.5 text-[11px] rounded-sm';

export default function QuoteList({ quotes, customers, onStatus, onConvert, busyId }) {
  const clientName = (q) => {
    if (q.customer_id) return customers.find(c => c.id === q.customer_id)?.name || 'Existing client';
    return q.customer_name || 'Walk-in enquiry';
  };

  return (
    <AtelierCard title="Saved Quotes" className="mt-4 md:mt-6">
      {quotes.length === 0 ? (
        <p className="text-sm text-stone-400 py-6 text-center">No quotes yet — estimate your first enquiry above.</p>
      ) : (
        <div className="divide-y divide-[#E7E5E4]">
          {quotes.map(q => {
            const busy = busyId === q.id;
            const canConvert = q.status !== 'Converted' && q.status !== 'Declined' && (q.customer_id || q.customer_name);
            return (
              <div key={q.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[#1C1917] truncate">{q.garment_type}</p>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium border rounded-sm ${STATUS_STYLES[q.status] || STATUS_STYLES.Draft}`}>{q.status}</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {clientName(q)} · {formatDate(q.date)}
                    {q.description ? ` · ${q.description.length > 48 ? q.description.slice(0, 48) + '…' : q.description}` : ''}
                  </p>
                </div>
                <div className="font-display text-lg font-semibold text-[#1C1917] md:w-32 text-right md:text-left">{formatCurrency(q.suggested_price)}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {q.status === 'Draft' && (
                    <>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onStatus(q, 'Sent')} className={smallAction}><Send className="w-3 h-3" /> Mark Sent</Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onStatus(q, 'Accepted')} className={smallAction}><Check className="w-3 h-3" /> Accepted</Button>
                    </>
                  )}
                  {q.status === 'Sent' && (
                    <>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onStatus(q, 'Accepted')} className={smallAction}><Check className="w-3 h-3" /> Accepted</Button>
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onStatus(q, 'Declined')} className={smallAction}><X className="w-3 h-3" /> Declined</Button>
                    </>
                  )}
                  {canConvert && q.status === 'Accepted' && (
                    <Button type="button" size="sm" disabled={busy} onClick={() => onConvert(q)} className="bg-[#800020] hover:bg-[#6b0018] text-white h-7 px-2.5 text-[11px] rounded-sm">
                      {busy ? 'Converting…' : <>Convert to Order <ArrowRight className="w-3 h-3" /></>}
                    </Button>
                  )}
                  {q.status === 'Converted' && q.converted_order_id && (
                    <Link to={`/orders/${q.converted_order_id}`} className="text-[11px] text-[#800020] font-medium hover:underline">View Order →</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AtelierCard>
  );
}