import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const CUSTOMER_TYPES = ['New Customer', 'Returning Customer', 'VIP', 'Bridal', 'Regular Wear', 'Occasion Wear', 'Corporate', 'Wholesale', 'Other'];
const SOURCES = ['Instagram', 'Facebook', 'TikTok', 'WhatsApp', 'Website', 'Referral', 'Walk-in', 'Event', 'Repeat Client', 'Saw Our Work', 'Other'];

export default function EditPersonalDialog({ open, onOpenChange, customer, onSaved }) {
  const [f, setF] = useState(() => ({ ...customer, customer_type: customer.customer_type || [], tags: customer.tags || [] }));
  const [tagInput, setTagInput] = useState((customer.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const toggleType = (t) => setF(p => ({ ...p, customer_type: p.customer_type.includes(t) ? p.customer_type.filter(x => x !== t) : [...p.customer_type, t] }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const patch = { ...f, tags: tagInput.split(',').map(t => t.trim()).filter(Boolean) };
      delete patch.id;
      const updated = await base44.entities.Customer.update(customer.id, patch);
      onOpenChange(false);
      onSaved(updated);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Customer Profile</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Full Name *</Label><Input required value={f.name || ''} onChange={e => set('name', e.target.value)} /></div>
            <div><Label>Preferred Name</Label><Input value={f.preferred_name || ''} onChange={e => set('preferred_name', e.target.value)} /></div>
          </div>
          <div>
            <Label>Customer Type</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CUSTOMER_TYPES.map(t => (
                <button type="button" key={t} onClick={() => toggleType(t)} className={`text-xs px-2.5 py-1 rounded-full border ${f.customer_type.includes(t) ? 'bg-[#800020] text-white border-[#800020]' : 'border-[#E7E5E4] text-stone-500'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div><Label>Tags (comma separated)</Label><Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="e.g. loyal, prefers evening slots" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label>
              <Select value={f.status || 'Active'} onValueChange={v => set('status', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Active', 'Inactive'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Customer Since</Label><Input type="date" value={f.customer_since || ''} onChange={e => set('customer_since', e.target.value)} /></div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E4]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Primary Phone</Label><Input value={f.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
              <div><Label>Alternative Phone</Label><Input value={f.alternative_phone || ''} onChange={e => set('alternative_phone', e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={f.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)} /></div>
              <div><Label>Preferred Contact Method</Label>
                <Select value={f.preferred_contact_method || ''} onValueChange={v => set('preferred_contact_method', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{['Phone', 'WhatsApp', 'Email'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Email</Label><Input type="email" value={f.email || ''} onChange={e => set('email', e.target.value)} /></div>
              <div><Label>Secondary Email</Label><Input type="email" value={f.secondary_email || ''} onChange={e => set('secondary_email', e.target.value)} /></div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E4]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date of Birth</Label><Input type="date" value={f.dob || ''} onChange={e => set('dob', e.target.value)} /></div>
              <div><Label>Gender</Label><Input value={f.gender || ''} onChange={e => set('gender', e.target.value)} /></div>
              <div><Label>Occupation</Label><Input value={f.occupation || ''} onChange={e => set('occupation', e.target.value)} /></div>
              <div><Label>Company / Organisation</Label><Input value={f.company || ''} onChange={e => set('company', e.target.value)} /></div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E4]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Address Line 1</Label><Input value={f.address_line1 || ''} onChange={e => set('address_line1', e.target.value)} /></div>
              <div><Label>Address Line 2</Label><Input value={f.address_line2 || ''} onChange={e => set('address_line2', e.target.value)} /></div>
              <div><Label>City</Label><Input value={f.city || ''} onChange={e => set('city', e.target.value)} /></div>
              <div><Label>Region / State</Label><Input value={f.region || ''} onChange={e => set('region', e.target.value)} /></div>
              <div><Label>Country</Label><Input value={f.country || ''} onChange={e => set('country', e.target.value)} /></div>
              <div><Label>Postcode</Label><Input value={f.postcode || ''} onChange={e => set('postcode', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><Label>Delivery Address</Label><Textarea rows={2} value={f.delivery_address || ''} onChange={e => set('delivery_address', e.target.value)} /></div>
              <div><Label>Billing Address</Label><Textarea rows={2} value={f.billing_address || ''} onChange={e => set('billing_address', e.target.value)} /></div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E4]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Alternative Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={f.alt_contact_name || ''} onChange={e => set('alt_contact_name', e.target.value)} /></div>
              <div><Label>Relationship</Label><Input value={f.alt_contact_relationship || ''} onChange={e => set('alt_contact_relationship', e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={f.alt_contact_phone || ''} onChange={e => set('alt_contact_phone', e.target.value)} /></div>
              <div><Label>Email</Label><Input value={f.alt_contact_email || ''} onChange={e => set('alt_contact_email', e.target.value)} /></div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E4]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Source & Referral</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Customer Source</Label>
                <Select value={f.entry_source || ''} onValueChange={v => set('entry_source', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Referred By</Label><Input value={f.referred_by || ''} onChange={e => set('referred_by', e.target.value)} /></div>
            </div>
            <div className="mt-3"><Label>Referral Notes</Label><Textarea rows={2} value={f.referral_notes || ''} onChange={e => set('referral_notes', e.target.value)} /></div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E4]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Relationship</p>
            <div><Label>Preferred Communication Time</Label><Input value={f.preferred_communication_time || ''} onChange={e => set('preferred_communication_time', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><Label>Customer Likes</Label><Textarea rows={2} value={f.customer_likes || ''} onChange={e => set('customer_likes', e.target.value)} /></div>
              <div><Label>Customer Dislikes</Label><Textarea rows={2} value={f.customer_dislikes || ''} onChange={e => set('customer_dislikes', e.target.value)} /></div>
            </div>
            <div className="mt-3"><Label>Special Instructions</Label><Textarea rows={2} value={f.special_instructions || ''} onChange={e => set('special_instructions', e.target.value)} /></div>
            <div className="mt-3"><Label>Important Relationship Notes</Label><Textarea rows={2} value={f.relationship_notes || ''} onChange={e => set('relationship_notes', e.target.value)} /></div>
          </div>

          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save Profile'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}