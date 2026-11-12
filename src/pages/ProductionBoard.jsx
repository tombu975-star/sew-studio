import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BoardColumn from '@/components/board/BoardColumn';
import OrderCard from '@/components/board/OrderCard';
import FeedbackDialog from '@/components/board/FeedbackDialog';
import { useRole } from '@/lib/roles';

const BOARD_COLUMNS = [
  { key: 'consultation', title: 'Consultation', statuses: ['Enquiry', 'Quoted', 'Consultation'] },
  { key: 'confirmed', title: 'Confirmed', statuses: ['Confirmed', 'Deposit Paid'] },
  { key: 'production', title: 'In Production', statuses: ['In Production'] },
  { key: 'fitting', title: 'Fitting & Alterations', statuses: ['Fitting', 'Alterations'] },
  { key: 'ready', title: 'Ready', statuses: ['Ready'] },
  { key: 'done', title: 'Delivered & Done', statuses: ['Collected/Delivered', 'Completed'] },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ProductionBoard() {
  const { isStaff } = useRole();
  const [orders, setOrders] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [checks, setChecks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [staffFilter, setStaffFilter] = useState('all');
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500).catch(() => []),
      base44.entities.Customer.list('-created_date', 500).catch(() => []),
      base44.entities.User.list().catch(() => []),
      base44.entities.BoardFeedback.list('-created_date', 500).catch(() => []),
      base44.entities.QualityCheck.list('-created_date', 500).catch(() => []),
      base44.auth.me().catch(() => null),
    ]).then(([o, c, u, f, q, me]) => {
      setOrders(o);
      setCustomers(c);
      setUsers(u);
      setFeedbacks(f);
      setChecks(q);
      setCurrentUser(me);
    });
  }, []);

  const customerName = (o) => customers.find(c => c.id === o.customer_id)?.name || 'Client';
  const staffName = (o) => users.find(u => u.id === o.assigned_staff_id)?.full_name || '';
  const userName = (id) => users.find(u => u.id === id)?.full_name || '';

  const countFor = (o) =>
    feedbacks.filter(f => f.order_id === o.id).length + checks.filter(c => c.order_id === o.id).length;

  const columns = useMemo(() => BOARD_COLUMNS
    .filter(col => !isStaff || col.key !== 'consultation')
    .map(col => ({
      ...col,
      cards: (orders || [])
        .filter(o => col.statuses.includes(o.status))
        .filter(o => staffFilter === 'all' || o.assigned_staff_id === staffFilter)
        .sort((a, b) => (a.delivery_date || '9999-12-31').localeCompare(b.delivery_date || '9999-12-31')),
    })), [orders, staffFilter, isStaff]);

  const addFeedback = async (kind, text, imageUrl) => {
    const created = await base44.entities.BoardFeedback.create({
      order_id: activeOrder.id, kind, text, image_url: imageUrl || undefined, date: todayISO(), author_id: currentUser?.id || null,
    });
    setFeedbacks(prev => [created, ...prev]);
    if (kind === 'Note' && isStaff) {
      const admins = users.filter(u => u.role === 'admin');
      const detail = `${customerName(activeOrder)} — ${activeOrder.garment_design || 'Order'}\n\n"${text}"\n\n— ${currentUser?.full_name || 'A staff member'}`;
      admins.forEach(a => {
        base44.functions.invoke('notifyStaff', { kind: 'production_note', user_id: a.id, detail }).catch(() => {});
      });
    }
  };

  const addCheck = async (stage, result, notes) => {
    const created = await base44.entities.QualityCheck.create({
      order_id: activeOrder.id, stage, result, notes, date: todayISO(), inspector_id: currentUser?.id || null,
    });
    setChecks(prev => [created, ...prev]);
  };

  const orderFeedback = (kind) => feedbacks
    .filter(f => f.order_id === activeOrder?.id && f.kind === kind)
    .map(f => ({ ...f, authorName: userName(f.author_id) }));

  return (
    <div className="p-4 sm:p-5 md:p-8 w-full min-w-0 max-w-full overflow-x-clip">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 max-w-[1200px]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><LayoutGrid className="w-3.5 h-3.5" />Live workflow</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>Production Board</h1>
          <p className="text-sm text-stone-500 mt-2">Every order by stage — tap a card to open it, or use Feedback to add notes, client comments and check-ins.</p>
        </div>
        <div className="w-full md:w-56">
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {orders === null ? (
        <div className="p-10 text-stone-400 text-sm">Loading board…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 w-full min-w-0">
          {columns.map(col => (
            <BoardColumn key={col.key} title={col.title} count={col.cards.length}>
              {col.cards.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  customerName={customerName(o)}
                  staffName={staffName(o)}
                  feedbackCount={countFor(o)}
                  onFeedback={() => setActiveOrder(o)}
                />
              ))}
            </BoardColumn>
          ))}
        </div>
      )}

      {activeOrder && (
        <FeedbackDialog
          order={activeOrder}
          customerName={customerName(activeOrder)}
          notes={orderFeedback('Note')}
          clientFeedback={orderFeedback('Client Feedback')}
          checks={checks.filter(c => c.order_id === activeOrder.id).map(c => ({ ...c, inspectorName: userName(c.inspector_id) }))}
          currentUserId={currentUser?.id}
          onClose={() => setActiveOrder(null)}
          onAddFeedback={addFeedback}
          onAddCheck={addCheck}
        />
      )}
    </div>
  );
}