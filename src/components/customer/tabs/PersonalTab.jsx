import React from 'react';

function Row({ label, value }) {
  return <div className="flex justify-between text-sm py-2 border-b border-[#E7E5E4] last:border-0"><span className="text-stone-500">{label}</span><span className="font-medium text-[#1C1917] text-right max-w-[60%]">{value || '—'}</span></div>;
}

export default function PersonalTab({ customer }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Identity</h3>
        <Row label="Full Name" value={customer.name} />
        <Row label="Preferred Name" value={customer.preferred_name} />
        <Row label="Date of Birth" value={customer.dob} />
        <Row label="Gender" value={customer.gender} />
        <Row label="Occupation" value={customer.occupation} />
        <Row label="Company" value={customer.company} />
      </div>
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Contact</h3>
        <Row label="Primary Phone" value={customer.phone} />
        <Row label="Alternative Phone" value={customer.alternative_phone} />
        <Row label="WhatsApp" value={customer.whatsapp} />
        <Row label="Email" value={customer.email} />
        <Row label="Secondary Email" value={customer.secondary_email} />
        <Row label="Preferred Contact Method" value={customer.preferred_contact_method} />
      </div>
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Address</h3>
        <Row label="Address" value={[customer.address_line1, customer.address_line2].filter(Boolean).join(', ')} />
        <Row label="City" value={customer.city} />
        <Row label="Region / State" value={customer.region} />
        <Row label="Country" value={customer.country} />
        <Row label="Postcode" value={customer.postcode} />
        <Row label="Delivery Address" value={customer.delivery_address} />
        <Row label="Billing Address" value={customer.billing_address} />
      </div>
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Alternative Contact</h3>
        <Row label="Name" value={customer.alt_contact_name} />
        <Row label="Relationship" value={customer.alt_contact_relationship} />
        <Row label="Phone" value={customer.alt_contact_phone} />
        <Row label="Email" value={customer.alt_contact_email} />
      </div>
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Source & Referral</h3>
        <Row label="Customer Source" value={customer.entry_source} />
        <Row label="Referred By" value={customer.referred_by} />
        <Row label="Referral Notes" value={customer.referral_notes} />
      </div>
      <div className="bg-white border border-[#E7E5E4] rounded-sm p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">Relationship</h3>
        <Row label="Preferred Communication Time" value={customer.preferred_communication_time} />
        <Row label="Customer Likes" value={customer.customer_likes} />
        <Row label="Customer Dislikes" value={customer.customer_dislikes} />
        <Row label="Special Instructions" value={customer.special_instructions} />
        <Row label="Relationship Notes" value={customer.relationship_notes} />
      </div>
    </div>
  );
}