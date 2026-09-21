import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';

const GARMENTS = ['Dress', 'Skirt', 'Blouse', 'Top', 'Trousers', 'Jumpsuit', 'Suit', 'Kaftan', 'Traditional Wear', 'Bridal Gown', 'Reception Dress', 'Bridesmaid Dress', 'Evening Wear', 'Casual Wear', 'Corporate Wear', 'Other'];
const OCCASIONS = ['Wedding', 'Engagement', 'Bridal', 'Bridesmaid', 'Birthday', 'Party', 'Dinner', 'Church', 'Corporate', 'Work', 'Casual', 'Traditional Event', 'Red Carpet', 'Holiday', 'Other'];
const LOOKS = ['Elegant', 'Classic', 'Modern', 'Minimal', 'Dramatic', 'Romantic', 'Traditional', 'Sophisticated', 'Trendy', 'Modest', 'Luxury', 'Other'];
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Season'];

export default function DesignRequestForm({ value, onChange, onGenerate, generating }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-sm p-5 space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Design Request</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>Garment Type *</Label>
          <Select value={value.garment_type} onValueChange={v => set('garment_type', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Select garment" /></SelectTrigger>
            <SelectContent>{GARMENTS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Occasion</Label>
          <Select value={value.occasion} onValueChange={v => set('occasion', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Select occasion" /></SelectTrigger>
            <SelectContent>{OCCASIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Desired Look</Label>
          <Select value={value.desired_look} onValueChange={v => set('desired_look', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Select look" /></SelectTrigger>
            <SelectContent>{LOOKS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Season</Label>
          <Select value={value.season} onValueChange={v => set('season', v)}><SelectTrigger className="rounded-sm"><SelectValue placeholder="Select season" /></SelectTrigger>
            <SelectContent>{SEASONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Target Budget (GHS)</Label><Input type="number" value={value.budget} onChange={e => set('budget', e.target.value)} /></div>
        <div><Label>Available Fabric</Label><Input value={value.fabric_available} onChange={e => set('fabric_available', e.target.value)} placeholder="e.g. Lace already in stock" /></div>
        <div className="sm:col-span-2"><Label>Colour Preference</Label><Input value={value.colour_preference} onChange={e => set('colour_preference', e.target.value)} placeholder="Customer's preferred colour, your suggestion, or no preference" /></div>
      </div>
      <div>
        <Label>Designer's Direction</Label>
        <Textarea rows={3} value={value.designer_direction} onChange={e => set('designer_direction', e.target.value)} placeholder='"Tell Sewsiness what you are thinking" — e.g. elegant but not too fitted, with African print incorporated.' />
      </div>
      <Button onClick={onGenerate} disabled={generating || !value.garment_type} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm gap-2 w-full sm:w-auto">
        <Sparkles className="w-4 h-4" /> {generating ? 'Generating…' : 'Generate Style Suggestions'}
      </Button>
    </div>
  );
}