import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const CATEGORIES = ['Contract', 'Invoice', 'Receipt', 'Agreement', 'Design Approval', 'Measurement Sheet', 'Customer Form', 'Other'];

export default function DocumentDialog({ open, onOpenChange, customerId, uploadedBy, onSaved }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.CustomerDocument.create({ customer_id: customerId, name: name || file.name, category, file_url, uploaded_by: uploadedBy, date: todayISO() });
      setName(''); setFile(null);
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm">
        <DialogHeader><DialogTitle className="font-display text-2xl">Upload Document</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Signed Contract" /></div>
          <div><Label>Category</Label>
            <Select value={category} onValueChange={setCategory}><SelectTrigger className="rounded-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>File *</Label><Input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} className="rounded-sm" /></div>
          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white">{saving ? 'Uploading…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}