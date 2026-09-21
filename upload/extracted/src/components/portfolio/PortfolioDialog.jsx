import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const CATEGORIES = ['Bridal', 'Evening Wear', 'Traditional', 'Ready-to-Wear', 'Accessories'];

export default function PortfolioDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', category: 'Bridal', description: '', completed_date: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setForm({ title: '', category: 'Bridal', description: '', completed_date: '' }); setFile(null); }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let image_url = '';
      if (file) {
        const uploaded = await base44.integrations.Core.UploadFile({ file });
        image_url = uploaded.file_url;
      }
      await onSave({
        title: form.title,
        category: form.category,
        description: form.description,
        completed_date: form.completed_date || null,
        image_url: image_url || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Add Portfolio Piece</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Beaded Ivory Bridal Gown" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Completed Date</Label><Input type="date" value={form.completed_date} onChange={e => setForm({ ...form, completed_date: e.target.value })} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Fabrics, details, occasion…" /></div>
          <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Saving…' : 'Add Piece'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}