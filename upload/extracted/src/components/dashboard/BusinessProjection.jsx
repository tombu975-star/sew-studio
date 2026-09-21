import React, { useState } from 'react';
import { TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BusinessProjection({ projection, payout, onPayoutSave }) {
  const [amount, setAmount] = useState(payout ? String(payout) : '');
  const [saving, setSaving] = useState(false);
  const within = payout <= projection.margin;

  const save = async () => {
    setSaving(true);
    try { await onPayoutSave(Number(amount) || 0); } finally { setSaving(false); }
  };

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm">
      <div className="px-5 py-3 border-b border-[#E7E5E4] flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#800020]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Business Projection</h3>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-sm text-stone-500">
            Available to pay yourself once these orders complete:
            <span className="font-display font-semibold text-[#800020] ml-2" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>
              {formatCurrency(projection.margin)}
            </span>
          </p>
          <p className="text-xs text-stone-400 mt-2">
            Across {projection.orders.length} order{projection.orders.length !== 1 ? 's' : ''} currently in production, fitting, alterations or ready —
            selling {formatCurrency(projection.margin + projection.trueCost)} against a true cost of {formatCurrency(projection.trueCost)}.
          </p>
        </div>
        <div className="pt-4 border-t border-[#E7E5E4] flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Label>Amount you've paid yourself</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="rounded-sm" />
          </div>
          <Button onClick={save} disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-1.5">
            <Wallet className="w-4 h-4" /> {saving ? 'Saving…' : 'Log Pay'}
          </Button>
        </div>
        {payout > 0 && (
          <p className={`text-xs font-medium ${within ? 'text-[#15803D]' : 'text-[#800020]'}`}>
            {formatCurrency(payout)} logged — {within ? 'within' : 'over'} the {formatCurrency(projection.margin)} available.
          </p>
        )}
      </div>
    </div>
  );
}