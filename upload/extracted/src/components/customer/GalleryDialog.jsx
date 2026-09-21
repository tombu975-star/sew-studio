import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const CATEGORIES = ['Inspiration', 'Previous Outfit', 'Approved Design', 'Sketch', 'Fabric Photo', 'Colour Reference', 'Fitting Photo', 'Final Outfit'];

export default function GalleryDialog({ open, onOpenChange, customerId, uploadedBy, onSaved }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Inspiration');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.CustomerGalleryItem.create({ customer_id: customerId, title, category, image_url: file_url, uploaded_by: uploadedBy, date: todayISO() });
      setTitle(''); setFile(null);
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Add to Gallery</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lace inspiration" /></div>
          <div><Label>Category</Label>
            <Select value={category} onValueChange={setCategory}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Image *</Label><Input type="file" accept="image/*" required onChange={e => setFile(e.target.files?.[0] || null)} className="rounded-sm" /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Uploading…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}