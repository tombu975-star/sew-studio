import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { fetchSettings } from '@/lib/costing';
import QuoteCalculator from '@/components/quotes/QuoteCalculator';
import QuoteList from '@/components/quotes/QuoteList';

export default function QuickQuote() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [overhead, setOverhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Customer.list('-created_date', 500).catch(() => []),
      base44.entities.Quote.list('-created_date', 100).catch(() => []),
      fetchSettings().catch(() => null),
    ]).then(([c, q, s]) => {
      setCustomers(c);
      setQuotes(q);
      setOverhead(Number(s?.overhead_amount) || 0);
      setLoading(false);
    });
  }, []);

  const saveQuote = async (data) => {
    const created = await base44.entities.Quote.create(data);
    setQuotes(prev => [created, ...prev]);
  };

  const setStatus = async (quote, status) => {
    setBusyId(quote.id);
    try {
      const updated = await base44.entities.Quote.update(quote.id, { status });
      setQuotes(prev => prev.map(q => (q.id === updated.id ? updated : q)));
    } finally {
      setBusyId(null);
    }
  };

  const convertToOrder = async (quote) => {
    setBusyId(quote.id);
    try {
      let customerId = quote.customer_id;
      if (!customerId && quote.customer_name) {
        const created = await base44.entities.Customer.create({ name: quote.customer_name });
        customerId = created.id;
      }
      if (!customerId) return;
      const order = await base44.entities.Order.create({
        customer_id: customerId,
        garment_design: quote.description?.trim() ? `${quote.garment_type} — ${quote.description}` : quote.garment_type,
        order_date: new Date().toISOString().slice(0, 10),
        status: 'Quoted',
        selling_price: Number(quote.suggested_price) || 0,
        notes: 'Created from Quick Quote.',
      });
      const updated = await base44.entities.Quote.update(quote.id, { status: 'Converted', converted_order_id: order.id });
      setQuotes(prev => prev.map(q => (q.id === updated.id ? updated : q)));
      navigate(`/orders/${order.id}`);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="p-10 text-stone-400 text-sm">Loading quotes…</div>;

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><Zap className="w-3.5 h-3.5" />Estimate in seconds</p>
        <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>Quick Quote</h1>
        <p className="text-sm text-stone-500 mt-2">Price a new enquiry fast — then save it and convert to an order when the client says yes.</p>
      </div>

      <QuoteCalculator customers={customers} overhead={overhead} onSave={saveQuote} />
      <QuoteList quotes={quotes} customers={customers} onStatus={setStatus} onConvert={convertToOrder} busyId={busyId} />
    </div>
  );
}