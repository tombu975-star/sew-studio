import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SOPCard from './SOPCard';
import SOPDialog from './SOPDialog';
import AssignDialog from './AssignDialog';

export default function AllSOPsTab({ sops, setSops, canManage, currentUser }) {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSop, setEditingSop] = useState(null);
  const [assignSop, setAssignSop] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = canManage ? sops : sops.filter(s => s.status === 'Active');
    if (!q) return visible;
    return visible.filter(s => s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q));
  }, [sops, search, canManage]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(s => {
      const key = s.category || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [filtered]);

  const openNew = () => { setEditingSop(null); setDialogOpen(true); };
  const openEdit = (sop) => { setEditingSop(sop); setDialogOpen(true); };

  const handleSaved = (saved) => {
    setSops(prev => {
      const exists = prev.some(s => s.id === saved.id);
      return exists ? prev.map(s => s.id === saved.id ? saved : s) : [saved, ...prev];
    });
  };

  const handleDelete = async (sop) => {
    await base44.entities.SOP.delete(sop.id);
    setSops(prev => prev.filter(s => s.id !== sop.id));
  };

  const handleArchive = async (sop) => {
    const saved = await base44.entities.SOP.update(sop.id, { status: 'Archived' });
    handleSaved(saved);
  };

  const handleDuplicate = async (sop) => {
    const { id, created_date, updated_date, created_by_id, version_history, ...rest } = sop;
    const saved = await base44.entities.SOP.create({ ...rest, title: `${sop.title} (Copy)`, is_template: false, status: 'Draft', version: 1, created_by: currentUser?.id });
    setSops(prev => [saved, ...prev]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search procedures…" className="pl-8 text-sm" />
        </div>
        {canManage && (
          <Button onClick={openNew} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm h-8 text-xs gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> New SOP
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-stone-400 py-10 text-center">
          {sops.length === 0 ? 'No SOPs added yet.' : 'No procedures match your search.'}
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 mb-2">{category}</p>
              <div className="space-y-2">
                {items.map(sop => (
                  <SOPCard
                    key={sop.id}
                    sop={sop}
                    canManage={canManage}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onArchive={handleArchive}
                    onAssign={canManage ? setAssignSop : null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <SOPDialog open={dialogOpen} onOpenChange={setDialogOpen} sop={editingSop} currentUser={currentUser} onSaved={handleSaved} />
      <AssignDialog open={!!assignSop} onOpenChange={(v) => !v && setAssignSop(null)} sop={assignSop} currentUser={currentUser} onAssigned={() => setAssignSop(null)} />
    </div>
  );
}