import React, { useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';
import MetricCard from '@/components/MetricCard';
import StockItemDialog from '@/components/stock/StockItemDialog';
import StockMovementDialog from '@/components/stock/StockMovementDialog';
import MovementHistoryDialog from '@/components/stock/MovementHistoryDialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

const isLow = (it) => (it.reorder_level || 0) > 0 && (it.quantity || 0) <= (it.reorder_level || 0);

export default function StockLedger() {
  const [items, setItems] = useState(null);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [itemDialog, setItemDialog] = useState(false);
  const [moveDialog, setMoveDialog] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);

  const load = () => {
    base44.entities.StockItem.list().then(list => setItems(list)).catch(() => setItems([]));
    base44.entities.StockMovement.list('-date', 500).then(list => setMovements(list)).catch(() => setMovements([]));
    base44.entities.Supplier.list().then(list => setSuppliers(list)).catch(() => setSuppliers([]));
    base44.entities.Order.filter({}).then(list => setOrders(list)).catch(() => setOrders([]));
  };

  useEffect(() => { load(); }, []);

  if (items === null) return <div className="p-10 text-stone-400 text-sm">Loading your stock…</div>;

  const lowItems = items.filter(isLow);
  const stockValue = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unit_cost || 0), 0);
  const moveCount = (id) => movements.filter(m => m.item_id === id).length;

  return (
    <div className="p-5 md:p-8 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><Package className="w-3.5 h-3.5" />Materials on the shelf</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>Stock Ledger</h1>
          <p className="text-sm text-stone-500 mt-2">Fabric, trims and supplies — what's on hand, what's running low, and every movement in between.</p>
        </div>
        <Button onClick={() => setItemDialog(true)} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm shrink-0"><Plus className="w-4 h-4" />Add item</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Items tracked" value={items.length} subText="across the studio" />
        <MetricCard label="Low stock" value={lowItems.length} subText="at or below reorder level" accent={lowItems.length > 0 ? 'danger' : 'default'} />
        <MetricCard label="Stock value" value={formatCurrency(stockValue)} subText="on-hand quantity at cost" />
      </div>

      {lowItems.length > 0 && (
        <div className="mb-6 border border-dashed border-[#D6BBB3] bg-[#FBF4F2] rounded-sm p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#800020] mb-2">Time to restock</p>
          <div className="flex flex-wrap gap-2">
            {lowItems.map(it => (
              <span key={it.id} className="text-xs bg-white border border-[#E7E5E4] rounded-sm px-2.5 py-1 text-stone-600">
                {it.name} <span className="text-stone-400">· {it.quantity || 0} {it.unit.toLowerCase()} left</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <AtelierCard title="On hand" bodyClassName="p-0">
        {items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-stone-400">Nothing on the shelf yet — add your first fabric or supply to start tracking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E7E5E4]">
                  <th className="text-left text-[11px] uppercase tracking-[0.14em] text-stone-400 font-medium px-5 py-3">Item</th>
                  <th className="text-right text-[11px] uppercase tracking-[0.14em] text-stone-400 font-medium px-3 py-3">On hand</th>
                  <th className="text-right text-[11px] uppercase tracking-[0.14em] text-stone-400 font-medium px-3 py-3 hidden sm:table-cell">Reorder at</th>
                  <th className="text-right text-[11px] uppercase tracking-[0.14em] text-stone-400 font-medium px-3 py-3 hidden md:table-cell">Cost / unit</th>
                  <th className="text-right text-[11px] uppercase tracking-[0.14em] text-stone-400 font-medium px-3 py-3 hidden md:table-cell">Value</th>
                  <th className="text-right text-[11px] uppercase tracking-[0.14em] text-stone-400 font-medium px-5 py-3">Ledger</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className="border-b border-[#F0EEEC] last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#1C1917]">{it.name}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{it.category}</p>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className={isLow(it) ? 'text-[#800020] font-semibold' : 'text-stone-700'}>{it.quantity || 0}</span>
                      <span className="text-stone-400 text-xs"> {it.unit.toLowerCase()}</span>
                      {isLow(it) && <span className="ml-2 text-[10px] uppercase tracking-wider bg-[#FBF4F2] text-[#800020] rounded-sm px-1.5 py-0.5">Low</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-stone-500 hidden sm:table-cell">{it.reorder_level || 0} <span className="text-stone-400 text-xs">{it.unit.toLowerCase()}</span></td>
                    <td className="px-3 py-3 text-right text-stone-500 hidden md:table-cell">{it.unit_cost ? formatCurrency(it.unit_cost) : '—'}</td>
                    <td className="px-3 py-3 text-right text-stone-700 hidden md:table-cell">{it.unit_cost ? formatCurrency((it.quantity || 0) * it.unit_cost) : '—'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] rounded-sm" onClick={() => setMoveDialog({ item: it, type: 'Stock In' })}>In</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] rounded-sm ml-1.5" onClick={() => setMoveDialog({ item: it, type: 'Stock Out' })}>Out</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] rounded-sm ml-1.5 text-stone-500" disabled={moveCount(it.id) === 0} onClick={() => setHistoryItem(it)}>Log{moveCount(it.id) > 0 ? ` (${moveCount(it.id)})` : ''}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AtelierCard>

      <StockItemDialog open={itemDialog} onOpenChange={setItemDialog} suppliers={suppliers} onSaved={load} />
      <StockMovementDialog open={!!moveDialog} onOpenChange={(o) => !o && setMoveDialog(null)} target={moveDialog} suppliers={suppliers} orders={orders} onSaved={load} />
      <MovementHistoryDialog open={!!historyItem} onOpenChange={(o) => !o && setHistoryItem(null)} item={historyItem} movements={movements} />
    </div>
  );
}