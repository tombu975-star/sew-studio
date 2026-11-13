import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Link2 } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { fetchUsers, userMap, fetchFittings, fetchPayments } from '@/lib/data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import CustomerHeader from '@/components/customer/CustomerHeader';
import EditPersonalDialog from '@/components/customer/EditPersonalDialog';
import NoteDialog from '@/components/customer/NoteDialog';
import RecordPaymentDialog from '@/components/customer/RecordPaymentDialog';
import AppointmentDialog from '@/components/customer/AppointmentDialog';
import MeasurementSetDialog from '@/components/customer/MeasurementSetDialog';

import OverviewTab from '@/components/customer/tabs/OverviewTab';
import PersonalTab from '@/components/customer/tabs/PersonalTab';
import MeasurementsTab from '@/components/customer/tabs/MeasurementsTab';
import ProportionsTab from '@/components/customer/tabs/ProportionsTab';
import StyleTab from '@/components/customer/tabs/StyleTab';
import OrdersTab from '@/components/customer/tabs/OrdersTab';
import FittingsTab from '@/components/customer/tabs/FittingsTab';
import AppointmentsTab from '@/components/customer/tabs/AppointmentsTab';
import MoneyTab from '@/components/customer/tabs/MoneyTab';
import CommunicationsTab from '@/components/customer/tabs/CommunicationsTab';
import GalleryTab from '@/components/customer/tabs/GalleryTab';
import DocumentsTab from '@/components/customer/tabs/DocumentsTab';
import FeedbackTab from '@/components/customer/tabs/FeedbackTab';
import ActivityTab from '@/components/customer/tabs/ActivityTab';

const TABS = [
  ['overview', 'Overview'], ['personal', 'Personal Details'], ['measurements', 'Measurements'],
  ['proportions', 'Proportions & Fit'], ['style', 'Style Profile'], ['orders', 'Orders'],
  ['fittings', 'Fittings'], ['appointments', 'Appointments'], ['money', 'Money'],
  ['communications', 'Communications'], ['gallery', 'Gallery'], ['documents', 'Documents'],
  ['feedback', 'Feedback'], ['activity', 'Activity'],
];

export default function CustomerProfile() {
  const { id } = useParams();
  const { isStaff, user } = useRole();
  const [customer, setCustomer] = useState(null);
  const [measurementSets, setMeasurementSets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [orders, setOrders] = useState([]);
  const [fittings, setFittings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('overview');
  const [portalCopied, setPortalCopied] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);

  const load = () => {
    base44.entities.Customer.get(id).then(setCustomer).catch(() => setCustomer(null));
    base44.entities.MeasurementSet.filter({ customer_id: id }, '-date_taken', 200).then(setMeasurementSets);
    base44.entities.Appointment.filter({ customer_id: id }, '-date', 200).then(setAppointments);
    base44.entities.CustomerNote.filter({ customer_id: id }, '-date', 200).then(setNotes);
    base44.entities.CustomerDocument.filter({ customer_id: id }, '-date', 200).then(setDocuments);
    base44.entities.CustomerGalleryItem.filter({ customer_id: id }, '-date', 200).then(setGallery);
    base44.entities.CommunicationLog.filter({ customer_id: id }, '-date', 200).then(setCommunications);
    base44.entities.CustomerFeedback.filter({ customer_id: id }, '-date', 200).then(setFeedback);
    base44.entities.Order.filter({ customer_id: id }, '-order_date', 200).then(o => {
      const list = isStaff && user ? o.filter(x => x.assigned_staff_id === user.id) : o;
      setOrders(list);
      const orderIds = new Set(list.map(x => x.id));
      fetchFittings().then(all => setFittings(all.filter(f => orderIds.has(f.order_id))));
      fetchPayments().then(all => setPayments(all.filter(p => orderIds.has(p.order_id))));
    });
    fetchUsers().then(setUsers);
  };
  useEffect(load, [id, isStaff, user]);

  const uMap = useMemo(() => userMap(users), [users]);
  const orderMap = useMemo(() => Object.fromEntries(orders.map(o => [o.id, o])), [orders]);
  const latestSet = measurementSets[0] || null;

  const stats = useMemo(() => {
    const lifetimeSpend = orders.reduce((s, o) => s + (Number(o.selling_price) || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalDeposits = payments.filter(p => p.type === 'Deposit').reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const activeOrders = orders.filter(o => !['Completed', 'Collected/Delivered'].includes(o.status));
    const upcoming = appointments.filter(a => a.date && new Date(a.date) >= new Date(new Date().toDateString()) && a.attendance === 'Scheduled').sort((a, b) => new Date(a.date) - new Date(b.date));
    const rated = feedback.filter(f => f.rating);
    return {
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      completedOrders: orders.filter(o => o.status === 'Completed').length,
      cancelledOrders: 0,
      lifetimeSpend,
      outstanding: lifetimeSpend - totalPaid,
      totalDeposits,
      appointmentsCount: appointments.length,
      currentOrder: activeOrders[0]?.garment_design || null,
      nextAppointment: upcoming[0]?.date || null,
      avgRating: rated.length ? rated.reduce((s, f) => s + Number(f.rating), 0) / rated.length : null,
    };
  }, [orders, payments, appointments, feedback]);

  const copyPortalLink = async () => {
    try {
      let token = customer.portal_token;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
        const updated = await base44.entities.Customer.update(id, { portal_token: token });
        setCustomer(updated);
      }
      const url = `${window.location.origin}/portal/${token}`;
      try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this portal link for your client:', url); }
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2000);
    } catch { setPortalCopied(false); }
  };

  if (customer === null && measurementSets.length === 0) return <div className="p-10 text-sm text-stone-400">Loading customer…</div>;
  if (!customer) return <div className="p-10 text-sm text-stone-400">Customer not found.</div>;

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-[#800020]"><ArrowLeft className="w-4 h-4" /> Customers</Link>
        <Button variant="outline" size="sm" className="rounded-sm gap-1.5" onClick={copyPortalLink}><Link2 className="w-3.5 h-3.5" /> {portalCopied ? 'Link Copied' : 'Client Portal'}</Button>
      </div>

      <CustomerHeader
        customer={customer}
        onEdit={() => setEditOpen(true)}
        onNewAppointment={() => setApptOpen(true)}
        onAddMeasurement={() => setMeasureOpen(true)}
        onAddNote={() => setNoteOpen(true)}
        onRecordPayment={() => setPayOpen(true)}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 px-1 mb-5">
          <TabsList className="w-max">
            {TABS.map(([v, label]) => <TabsTrigger key={v} value={v}>{label}</TabsTrigger>)}
          </TabsList>
        </div>

        <TabsContent value="overview"><OverviewTab stats={stats} isStaff={isStaff} notes={notes} uMap={uMap} customer={customer} /></TabsContent>
        <TabsContent value="personal"><PersonalTab customer={customer} /></TabsContent>
        <TabsContent value="measurements"><MeasurementsTab sets={measurementSets} uMap={uMap} customerId={id} userId={user?.id} onReload={load} /></TabsContent>
        <TabsContent value="proportions"><ProportionsTab customer={customer} latestSet={latestSet} onCustomerSaved={setCustomer} /></TabsContent>
        <TabsContent value="style"><StyleTab customer={customer} onSaved={setCustomer} /></TabsContent>
        <TabsContent value="orders"><OrdersTab orders={orders} isStaff={isStaff} customerId={id} /></TabsContent>
        <TabsContent value="fittings"><FittingsTab fittings={fittings} orderMap={orderMap} /></TabsContent>
        <TabsContent value="appointments"><AppointmentsTab appointments={appointments} customerId={id} users={users} uMap={uMap} orders={orders} onReload={load} /></TabsContent>
        {!isStaff && <TabsContent value="money"><MoneyTab orders={orders} payments={payments} orderMap={orderMap} /></TabsContent>}
        <TabsContent value="communications"><CommunicationsTab communications={communications} customerId={id} staffId={user?.id} uMap={uMap} onReload={load} /></TabsContent>
        <TabsContent value="gallery"><GalleryTab items={gallery} customerId={id} userId={user?.id} onReload={load} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab documents={documents} customerId={id} userId={user?.id} onReload={load} /></TabsContent>
        <TabsContent value="feedback"><FeedbackTab feedback={feedback} customerId={id} staffId={user?.id} onReload={load} /></TabsContent>
        <TabsContent value="activity"><ActivityTab customer={customer} orders={orders} payments={payments} appointments={appointments} fittings={fittings} communications={communications} notes={notes} gallery={gallery} measurementSets={measurementSets} isStaff={isStaff} /></TabsContent>
      </Tabs>

      <EditPersonalDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} onSaved={setCustomer} />
      <NoteDialog open={noteOpen} onOpenChange={setNoteOpen} customerId={id} userId={user?.id} onSaved={load} />
      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} orders={orders} onSaved={load} />
      <AppointmentDialog open={apptOpen} onOpenChange={setApptOpen} customerId={id} users={users} orders={orders} onSaved={load} />
      <MeasurementSetDialog open={measureOpen} onOpenChange={setMeasureOpen} customerId={id} taker={user?.id} onSaved={load} />
    </div>
  );
}