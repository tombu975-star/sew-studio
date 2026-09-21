import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

function Num({ label, k, f, set }) {
  return <div><Label className="text-xs">{label}</Label><Input type="number" step="0.1" value={f[k] ?? ''} onChange={e => set(k, e.target.value)} className="rounded-sm h-8" /></div>;
}
function Group({ title, children }) {
  return (
    <div className="border border-[#E7E5E4] rounded-sm p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#800020] mb-2.5">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">{children}</div>
    </div>
  );
}

const empty = (customerId) => ({
  customer_id: customerId, set_name: '', date_taken: todayISO(), unit: 'Inches', garment_type: 'General',
  status: 'Draft', customer_approval: 'Pending', general_notes: '',
});

export default function MeasurementSetDialog({ open, onOpenChange, customerId, taker, duplicateFrom, onSaved }) {
  const [f, setF] = useState(() => duplicateFrom ? { ...duplicateFrom, id: undefined, set_name: `${duplicateFrom.set_name} (copy)`, date_taken: todayISO(), status: 'Draft', customer_approval: 'Pending' } : empty(customerId));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...f, customer_id: customerId, taken_by: taker };
      delete payload.id;
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      await base44.entities.MeasurementSet.create(payload);
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">New Measurement Set</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2"><Label>Set Name *</Label><Input required value={f.set_name} onChange={e => set('set_name', e.target.value)} placeholder="e.g. Bridal Gown Fitting" /></div>
            <div><Label>Date Taken</Label><Input type="date" value={f.date_taken} onChange={e => set('date_taken', e.target.value)} /></div>
            <div><Label>Unit</Label>
              <Select value={f.unit} onValueChange={v => set('unit', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Inches', 'Centimetres'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Garment Type</Label>
              <Select value={f.garment_type} onValueChange={v => set('garment_type', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['General', 'Dress', 'Top', 'Skirt', 'Trousers', 'Bridal'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={v => set('status', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Draft', 'Confirmed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label>Customer Approval</Label>
              <Select value={f.customer_approval} onValueChange={v => set('customer_approval', v)}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Pending', 'Approved'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          <Group title="A · Height">
            <Num label="Height" k="height" f={f} set={set} />
          </Group>
          <Group title="B · Neck">
            <Num label="Neck Circumference" k="neck_circumference" f={f} set={set} />
            <Num label="Front Neck Depth" k="front_neck_depth" f={f} set={set} />
            <Num label="Back Neck Depth" k="back_neck_depth" f={f} set={set} />
          </Group>
          <Group title="C · Shoulders">
            <Num label="Shoulder Width" k="shoulder_width" f={f} set={set} />
            <Num label="Left Shoulder Length" k="left_shoulder_length" f={f} set={set} />
            <Num label="Right Shoulder Length" k="right_shoulder_length" f={f} set={set} />
            <Num label="Left Shoulder Height" k="left_shoulder_height" f={f} set={set} />
            <Num label="Right Shoulder Height" k="right_shoulder_height" f={f} set={set} />
            <Num label="Across Shoulder" k="across_shoulder" f={f} set={set} />
            <Num label="Across Back" k="across_back" f={f} set={set} />
            <Num label="Across Chest" k="across_chest" f={f} set={set} />
            <div><Label className="text-xs">Shoulder Slope</Label>
              <Select value={f.shoulder_slope || ''} onValueChange={v => set('shoulder_slope', v)}><SelectTrigger className="rounded-sm h-8"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{['Square', 'Normal', 'Sloping', 'Uneven', 'Custom'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </Group>
          <Group title="D · Bust">
            <Num label="Full Bust" k="full_bust" f={f} set={set} />
            <Num label="High Bust" k="high_bust" f={f} set={set} />
            <Num label="Upper Bust" k="upper_bust" f={f} set={set} />
            <Num label="Underbust" k="underbust" f={f} set={set} />
            <Num label="Bust Point to Bust Point" k="bust_point_to_bust_point" f={f} set={set} />
            <Num label="Shoulder to Bust Point" k="shoulder_to_bust_point" f={f} set={set} />
            <Num label="Bust Point to Waist" k="bust_point_to_waist" f={f} set={set} />
            <Num label="Left Bust" k="left_bust" f={f} set={set} />
            <Num label="Right Bust" k="right_bust" f={f} set={set} />
          </Group>
          <Group title="E · Waist / Torso">
            <Num label="Natural Waist" k="natural_waist" f={f} set={set} />
            <Num label="High Waist" k="high_waist" f={f} set={set} />
            <Num label="Lower Waist" k="lower_waist" f={f} set={set} />
            <Num label="Shoulder to Natural Waist" k="shoulder_to_natural_waist" f={f} set={set} />
            <Num label="Waist to Hip" k="waist_to_hip" f={f} set={set} />
            <Num label="Waist to Floor" k="waist_to_floor" f={f} set={set} />
          </Group>
          <Group title="F · Hip / Lower Body">
            <Num label="High Hip" k="high_hip" f={f} set={set} />
            <Num label="Full Hip" k="full_hip" f={f} set={set} />
            <Num label="Left Thigh" k="left_thigh" f={f} set={set} />
            <Num label="Right Thigh" k="right_thigh" f={f} set={set} />
            <Num label="Left Knee" k="left_knee" f={f} set={set} />
            <Num label="Right Knee" k="right_knee" f={f} set={set} />
            <Num label="Left Calf" k="left_calf" f={f} set={set} />
            <Num label="Right Calf" k="right_calf" f={f} set={set} />
            <Num label="Left Ankle" k="left_ankle" f={f} set={set} />
            <Num label="Right Ankle" k="right_ankle" f={f} set={set} />
            <Num label="Crotch Depth" k="crotch_depth" f={f} set={set} />
            <Num label="Front Rise" k="front_rise" f={f} set={set} />
            <Num label="Back Rise" k="back_rise" f={f} set={set} />
          </Group>
          <Group title="G · Arms">
            <Num label="Armhole" k="armhole" f={f} set={set} />
            <Num label="Left Upper Arm" k="left_upper_arm" f={f} set={set} />
            <Num label="Right Upper Arm" k="right_upper_arm" f={f} set={set} />
            <Num label="Left Wrist" k="left_wrist" f={f} set={set} />
            <Num label="Right Wrist" k="right_wrist" f={f} set={set} />
            <Num label="Sleeve Length" k="sleeve_length" f={f} set={set} />
            <Num label="Shoulder to Wrist" k="shoulder_to_wrist" f={f} set={set} />
          </Group>
          <Group title="H · Legs">
            <Num label="Inseam" k="inseam" f={f} set={set} />
            <Num label="Outseam" k="outseam" f={f} set={set} />
            <Num label="Leg Thigh" k="leg_thigh" f={f} set={set} />
            <Num label="Leg Knee" k="leg_knee" f={f} set={set} />
            <Num label="Leg Calf" k="leg_calf" f={f} set={set} />
            <Num label="Leg Ankle" k="leg_ankle" f={f} set={set} />
          </Group>
          <Group title="I · Full-Length Garment">
            <Num label="Shoulder to Floor" k="shoulder_to_floor" f={f} set={set} />
            <Num label="Bust to Floor" k="bust_to_floor" f={f} set={set} />
            <Num label="Dress Length" k="dress_length" f={f} set={set} />
            <Num label="Skirt Length" k="skirt_length" f={f} set={set} />
            <Num label="Top Length" k="top_length" f={f} set={set} />
            <Num label="Trouser Length" k="trouser_length" f={f} set={set} />
          </Group>

          <div><Label>Custom Measurements</Label><Textarea rows={2} value={f.custom_measurements || ''} onChange={e => set('custom_measurements', e.target.value)} placeholder="Any extra measurements not covered above" /></div>
          <div><Label>General Notes</Label><Textarea rows={2} value={f.general_notes || ''} onChange={e => set('general_notes', e.target.value)} /></div>

          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Save Measurement Set'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}