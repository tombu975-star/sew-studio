import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Mail, Plus, Ruler, StickyNote, CalendarPlus, CreditCard, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export default function CustomerHeader({ customer, onEdit, onNewAppointment, onAddMeasurement, onAddNote, onRecordPayment }) {
  const wa = (customer.whatsapp || customer.phone || '').replace(/[^\d+]/g, '');
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#FBF9F7] border border-[#E7E5E4] flex items-center justify-center font-display text-2xl font-semibold text-[#800020] overflow-hidden">
            {(customer.preferred_name || customer.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-semibold text-[#1C1917]" style={{ fontSize: 'clamp(26px, 4vw, 34px)' }}>{customer.name}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${customer.status === 'Inactive' ? 'bg-stone-100 text-stone-500' : 'bg-[#15803D]/10 text-[#15803D]'}`}>{customer.status || 'Active'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {(customer.customer_type || []).map(t => <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#800020]/10 text-[#800020]">{t}</span>)}
              {(customer.tags || []).map(t => <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">#{t}</span>)}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mt-2">
              {customer.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{customer.phone}</span>}
              {customer.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
              {customer.customer_since && <span>Customer since {formatDate(customer.customer_since)}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/customers/${customer.id}/style-assist`}><Button size="sm" className="rounded-sm gap-1.5 bg-[#800020] hover:bg-[#6b0018] text-white"><Sparkles className="w-3.5 h-3.5" /> Style Assist</Button></Link>
          <Button variant="outline" size="sm" className="rounded-sm gap-1.5" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /> Edit Profile</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        {customer.phone && <a href={`tel:${customer.phone}`}><Button variant="outline" size="sm" className="rounded-sm gap-1.5"><Phone className="w-3.5 h-3.5" /> Call</Button></a>}
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><Button variant="outline" size="sm" className="rounded-sm gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Button></a>}
        {customer.email && <a href={`mailto:${customer.email}`}><Button variant="outline" size="sm" className="rounded-sm gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</Button></a>}
        <Link to={`/orders/new?customer=${customer.id}`}><Button variant="outline" size="sm" className="rounded-sm gap-1.5"><Plus className="w-3.5 h-3.5" /> New Order</Button></Link>
        <Button variant="outline" size="sm" className="rounded-sm gap-1.5" onClick={onNewAppointment}><CalendarPlus className="w-3.5 h-3.5" /> New Appointment</Button>
        <Button variant="outline" size="sm" className="rounded-sm gap-1.5" onClick={onAddMeasurement}><Ruler className="w-3.5 h-3.5" /> Add Measurement</Button>
        <Button variant="outline" size="sm" className="rounded-sm gap-1.5" onClick={onAddNote}><StickyNote className="w-3.5 h-3.5" /> Add Note</Button>
        <Button variant="outline" size="sm" className="rounded-sm gap-1.5" onClick={onRecordPayment}><CreditCard className="w-3.5 h-3.5" /> Record Payment</Button>
      </div>
    </div>
  );
}