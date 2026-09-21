import React, { useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { GARMENT_TYPES, COMPLEXITY_OPTIONS, URGENCY_OPTIONS, quotePrice } from '@/lib/quote';

const segBtn = 'px-3 py-1.5 text-xs rounded-sm border transition';
const segOn = 'bg-[#800020] text-white border-[#800020] font-medium';
const segOff = 'bg-white text-stone-500 border-[#E7E5E4] hover:border-stone-300';

export default function QuoteCalculator({ customers, overhead, onSave }) {
  const [garmentType, setGarmentType] = useState(GARMENT_TYPES[1].value);
  const [complexity, setComplexity] = useState('Moderate');
  const [urgency, setUrgency] = useState('Normal');
  const [fabricCost, setFabricCost] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const price = useMemo(
    () => quotePrice({ garmentType, complexity, urgency, fabricCost, overhead }),
    [garmentType, complexity, urgency, fabricCost, overhead]
  );

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        customer_id: customerId && customerId !== 'new' ? customerId : null,
        customer_name: customerId === 'new' ? (customerName.trim() || null) : null,
        garment_type: garmentType,
        description: description.trim() || null,
        fabric_cost: fabricCost === '' ? null : Number(fabricCost),
        complexity,
        urgency,
        suggested_price: price,
        status: 'Draft',
        date: new Date().toISOString().slice(0, 10),
      });
      setDescription('');
      setCustomerName('');
      setFabricCost('');
      setCustomerId('');
    } finally {
      setSaving(false);
    }
  };

  const base = GARMENT_TYPES.find(g => g.value === garmentType)?.base || 0;

  return (
    <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      {/* Inputs */}
      <div className="lg:col-span-2 bg-white border border-[#E7E5E4] rounded-sm p-5 space-y-4">
        <div>
          <Label>Garment Type</Label>
          <Select value={garmentType} onValueChange={setGarmentType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GARMENT_TYPES.map(g => <SelectItem key={g.value} value={g.value}>{g.value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Client</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Choose existing client — or new enquiry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">＋ New client (type name)</SelectItem>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {customerId === 'new' && (
            <Input className="mt-2" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Client name" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Complexity</Label>
            <div className="flex gap-1.5">
              {COMPLEXITY_OPTIONS.map(c => (
                <button type="button" key={c.value} onClick={() => setComplexity(c.value)}
                  className={`${segBtn} ${complexity === c.value ? segOn : segOff}`}>
                  {c.value}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Urgency</Label>
            <div className="flex gap-1.5">
              {URGENCY_OPTIONS.map(u => (
                <button type="button" key={u.value} onClick={() => setUrgency(u.value)}
                  className={`${segBtn} ${urgency === u.value ? segOn : segOff}`}>
                  {u.value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label>Fabric Cost (if known)</Label>
          <Input type="number" min="0" value={fabricCost} onChange={e => setFabricCost(e.target.value)} placeholder="e.g. 800" />
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Off-shoulder evening gown, beaded bodice, floor-length" />
        </div>
      </div>

      {/* Live price */}
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5 flex flex-col">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Suggested Price
        </div>
        <div className="font-display text-4xl font-semibold text-[#800020] mt-3 leading-none">{formatCurrency(price)}</div>
        <p className="text-[11px] text-stone-400 mt-2">Deposit to confirm: <span className="font-medium text-[#1C1917]">{formatCurrency(price / 2)}</span></p>
        <div className="border-t border-[#F3F1EF] mt-4 pt-3 space-y-1.5 text-[11px] text-stone-500">
          <div className="flex justify-between"><span>{garmentType} base</span><span>{formatCurrency(base)}</span></div>
          <div className="flex justify-between"><span>Complexity — {complexity}</span><span>×{COMPLEXITY_OPTIONS.find(c => c.value === complexity)?.factor}</span></div>
          <div className="flex justify-between"><span>Urgency — {urgency}</span><span>×{URGENCY_OPTIONS.find(u => u.value === urgency)?.factor}</span></div>
          <div className="flex justify-between"><span>Fabric</span><span>+{formatCurrency(fabricCost)}</span></div>
          {overhead > 0 && <div className="flex justify-between"><span>Overhead</span><span>+{formatCurrency(overhead)}</span></div>}
        </div>
        <Button type="submit" disabled={saving} className="mt-auto pt-3 bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm mt-5 h-10">
          {saving ? 'Saving…' : 'Save Quote'}
        </Button>
      </div>
    </form>
  );
}