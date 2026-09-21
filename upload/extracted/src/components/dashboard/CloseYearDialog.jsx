import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchOrders, fetchPayments, fetchMaterials, fetchLabour, fetchAdditional, orderCostTotal } from '@/lib/data';
import { fetchSettings } from '@/lib/costing';
import { formatCurrency } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inYear = (d, y) => d && new Date(d).getFullYear() === y;

export default function CloseYearDialog({ open, year, onClose, onClosed }) {
  const [s, setS] = useState(null);
  const [ownerPay, setOwnerPay] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      fetchOrders(), fetchPayments(), fetchMaterials(), fetchLabour(), fetchAdditional(),
      base44.entities.OtherIncome.list().catch(() => []),
      fetchSettings().catch(() => null)
    ]).then(([orders, payments, materials, labour, additional, otherIncome, settings]) => {
      if (cancelled) return;
      const overhead = Number(settings?.overhead_amount) || 0;
      const customOrders = payments.filter(p => inYear(p.date, year)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const streams = { 'Ready-to-Wear': 0, 'Alterations': 0, 'Training': 0 };
      otherIncome.filter(i => inYear(i.date, year)).forEach(i => { if (streams[i.type] != null) streams[i.type] += Number(i.amount) || 0; });
      const trueCost = orders.filter(o => inYear(o.delivery_date, year))
        .reduce((sum, o) => sum + orderCostTotal(o.id, materials, labour, additional) + overhead, 0);
      const revenue = customOrders + streams['Ready-to-Wear'] + streams.Alterations + streams.Training;
      setS({ revenue, trueCost, margin: revenue - trueCost, customOrders, rtw: streams['Ready-to-Wear'], alterations: streams.Alterations, training: streams.Training });
      setOwnerPay(String(Number(settings?.self_payout) || 0));
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [open, year]);

  const confirm = async () => {
    if (!s) return;
    setSaving(true);
    try {
      const rec = await base44.entities.ClosedYear.create({
        year,
        revenue: s.revenue,
        true_cost: s.trueCost,
        margin: s.margin,
        owner_pay: Number(ownerPay) || 0,
        custom_orders: s.customOrders,
        rtw: s.rtw,
        alterations: s.alterations,
        training: s.training,
        closed_date: new Date().toISOString().slice(0, 10)
      });
      onClosed(rec);
      onClose();
    } finally { setSaving(false); }
  };

  const Row = ({ label, value }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-[#1C1917]">{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-sm max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Lock className="w-4 h-4 text-[#800020]" />Close out {year}</DialogTitle>
          <DialogDescription>This locks the year's numbers as final — they'll show in Business History for comparison, not ongoing editing.</DialogDescription>
        </DialogHeader>
        {!s ? (
          <p className="text-sm text-stone-400 py-4">Adding up the year…</p>
        ) : (
          <div className="space-y-1">
            <Row label="Total revenue" value={formatCurrency(s.revenue)} />
            <Row label="Custom orders (payments received)" value={formatCurrency(s.customOrders)} />
            <Row label="RTW · Alterations · Training" value={`${formatCurrency(s.rtw)} · ${formatCurrency(s.alterations)} · ${formatCurrency(s.training)}`} />
            <Row label="Total true cost" value={formatCurrency(s.trueCost)} />
            <Row label="Margin" value={formatCurrency(s.margin)} />
            <div className="pt-3 border-t border-[#E7E5E4]">
              <Label>Owner pay drawn in {year}</Label>
              <Input type="number" value={ownerPay} onChange={e => setOwnerPay(e.target.value)} className="rounded-sm mt-1.5" />
              <p className="text-xs text-stone-400 mt-1.5">Pre-filled with what you've recorded paying yourself — adjust it to what you actually drew in {year}.</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-sm">Cancel</Button>
          <Button onClick={confirm} disabled={saving || !s} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Closing…' : `Close ${year}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}