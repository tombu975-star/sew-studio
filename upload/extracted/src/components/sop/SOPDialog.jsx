import React, { useState } from 'react';
import { Plus, Loader2, History, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import ArrayListEditor from './ArrayListEditor';

const CATEGORIES = ['Customer Management', 'Consultation & Order Management', 'Measurements', 'Design', 'Pricing & Money', 'Production', 'Fabric & Materials', 'Quality Control', 'Fitting & Alterations', 'Delivery', 'Staff', 'Training', 'Customer Service', 'Special Situations', 'RTW', 'Business Review', 'Other'];
const ROLES = ['Any', 'Madam', 'Staff', 'Trainee', 'Trainer'];
const EVIDENCE = ['Photo', 'Document', 'Notes'];

export default function SOPDialog({ open, onOpenChange, sop, currentUser, onSaved }) {
  const [title, setTitle] = useState(sop?.title || '');
  const [category, setCategory] = useState(sop?.category || 'Production');
  const [status, setStatus] = useState(sop?.status || 'Draft');
  const [purpose, setPurpose] = useState(sop?.purpose || sop?.summary || '');
  const [scope, setScope] = useState(sop?.scope || '');
  const [whenToUse, setWhenToUse] = useState(sop?.when_to_use || '');
  const [responsibleRole, setResponsibleRole] = useState(sop?.responsible_role || 'Any');
  const [requiredInfo, setRequiredInfo] = useState(sop?.required_information || '');
  const [requiredMaterials, setRequiredMaterials] = useState(sop?.required_materials || '');
  const [steps, setSteps] = useState(sop?.steps?.length ? sop.steps : ['']);
  const [checklistItems, setChecklistItems] = useState(sop?.checklist_items?.length ? sop.checklist_items : ['']);
  const [completionCriteria, setCompletionCriteria] = useState(sop?.completion_criteria || '');
  const [evidenceRequired, setEvidenceRequired] = useState(sop?.evidence_required || []);
  const [requiresManager, setRequiresManager] = useState(!!sop?.requires_manager_approval);
  const [requiresTrainer, setRequiresTrainer] = useState(!!sop?.requires_trainer_approval);
  const [requiresCustomer, setRequiresCustomer] = useState(!!sop?.requires_customer_approval);
  const [requiresQc, setRequiresQc] = useState(!!sop?.requires_qc_approval);
  const [commonProblems, setCommonProblems] = useState(sop?.common_problems || '');
  const [exceptionConditions, setExceptionConditions] = useState(sop?.exception_conditions || '');
  const [escalationProcedure, setEscalationProcedure] = useState(sop?.escalation_procedure || '');
  const [relatedNotes, setRelatedNotes] = useState(sop?.related_notes || '');
  const [attachmentUrl, setAttachmentUrl] = useState(sop?.attachment_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const toggleEvidence = (v) => setEvidenceRequired(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const uploadFile = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachmentUrl(file_url);
    setUploading(false);
  };

  const restoreVersion = (v) => {
    setTitle(v.title || title);
    if (v.change_summary) { /* informational only */ }
    setShowHistory(false);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const isNewVersion = !!sop && sop.title !== title.trim();
    const history = sop?.version_history || [];
    const data = {
      title: title.trim(),
      category,
      status,
      purpose: purpose.trim(),
      scope: scope.trim(),
      when_to_use: whenToUse.trim(),
      responsible_role: responsibleRole,
      required_information: requiredInfo.trim(),
      required_materials: requiredMaterials.trim(),
      steps: steps.map(s => s.trim()).filter(Boolean),
      checklist_items: checklistItems.map(s => s.trim()).filter(Boolean),
      completion_criteria: completionCriteria.trim(),
      evidence_required: evidenceRequired,
      requires_manager_approval: requiresManager,
      requires_trainer_approval: requiresTrainer,
      requires_customer_approval: requiresCustomer,
      requires_qc_approval: requiresQc,
      common_problems: commonProblems.trim(),
      exception_conditions: exceptionConditions.trim(),
      escalation_procedure: escalationProcedure.trim(),
      related_notes: relatedNotes.trim(),
      attachment_url: attachmentUrl || undefined,
      created_by: sop?.created_by || currentUser?.id || null,
      version: sop ? (isNewVersion ? (sop.version || 1) + 1 : (sop.version || 1)) : 1,
      version_history: isNewVersion
        ? [...history, { version: sop.version || 1, title: sop.title, changed_by: currentUser?.full_name || currentUser?.email || 'Unknown', changed_date: new Date().toISOString().slice(0, 10), change_summary: `Renamed from "${sop.title}"` }]
        : history,
    };
    const saved = sop ? await base44.entities.SOP.update(sop.id, data) : await base44.entities.SOP.create(data);
    setSaving(false);
    onSaved(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between gap-2 pr-6">
            <span>{sop ? 'Edit SOP' : 'New SOP'}</span>
            {sop?.version_history?.length > 0 && (
              <button type="button" onClick={() => setShowHistory(s => !s)} className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#800020] font-normal">
                <History className="w-3.5 h-3.5" /> Version {sop.version || 1} · History
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        {showHistory && sop?.version_history?.length > 0 && (
          <div className="border border-[#E7E5E4] rounded-sm p-3 space-y-2 bg-[#FBF9F7]">
            {sop.version_history.slice().reverse().map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-[#1C1917]">v{v.version} — {v.title}</span>
                  <span className="text-stone-400 ml-2">{v.changed_by}, {v.changed_date}</span>
                </div>
                <button type="button" onClick={() => restoreVersion(v)} className="inline-flex items-center gap-1 text-[#800020] hover:underline">
                  <RotateCcw className="w-3 h-3" /> Restore title
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="SOP Name" className="text-sm col-span-2" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{['Draft', 'Active', 'Archived'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1">Responsible Role</p>
            <Select value={responsibleRole} onValueChange={setResponsibleRole}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Purpose — why this procedure exists" className="text-sm min-h-[50px]" />
          <Textarea value={whenToUse} onChange={e => setWhenToUse(e.target.value)} placeholder="When to use this procedure" className="text-sm min-h-[40px]" />
          <Textarea value={scope} onChange={e => setScope(e.target.value)} placeholder="Scope — what this covers / doesn't cover" className="text-sm min-h-[40px]" />
          <Textarea value={requiredInfo} onChange={e => setRequiredInfo(e.target.value)} placeholder="Required information before starting" className="text-sm min-h-[40px]" />
          <Textarea value={requiredMaterials} onChange={e => setRequiredMaterials(e.target.value)} placeholder="Required materials / tools" className="text-sm min-h-[40px]" />

          <ArrayListEditor label="Steps" items={steps} onChange={setSteps} placeholder="Step" />
          <ArrayListEditor label="Checklist Items" items={checklistItems} onChange={setChecklistItems} placeholder="Checklist item" />

          <Textarea value={completionCriteria} onChange={e => setCompletionCriteria(e.target.value)} placeholder="Completion criteria — how you know it's done" className="text-sm min-h-[40px]" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">Evidence Required</p>
            <div className="flex gap-4">
              {EVIDENCE.map(v => (
                <label key={v} className="flex items-center gap-1.5 text-xs text-[#1C1917]">
                  <Checkbox checked={evidenceRequired.includes(v)} onCheckedChange={() => toggleEvidence(v)} /> {v}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">Approvals Required</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 text-xs text-[#1C1917]"><Checkbox checked={requiresManager} onCheckedChange={setRequiresManager} /> Manager</label>
              <label className="flex items-center gap-1.5 text-xs text-[#1C1917]"><Checkbox checked={requiresTrainer} onCheckedChange={setRequiresTrainer} /> Trainer</label>
              <label className="flex items-center gap-1.5 text-xs text-[#1C1917]"><Checkbox checked={requiresCustomer} onCheckedChange={setRequiresCustomer} /> Customer</label>
              <label className="flex items-center gap-1.5 text-xs text-[#1C1917]"><Checkbox checked={requiresQc} onCheckedChange={setRequiresQc} /> Quality Control</label>
            </div>
          </div>

          <Textarea value={commonProblems} onChange={e => setCommonProblems(e.target.value)} placeholder="Common problems" className="text-sm min-h-[40px]" />
          <Textarea value={exceptionConditions} onChange={e => setExceptionConditions(e.target.value)} placeholder="Exception conditions" className="text-sm min-h-[40px]" />
          <Textarea value={escalationProcedure} onChange={e => setEscalationProcedure(e.target.value)} placeholder="Escalation procedure" className="text-sm min-h-[40px]" />
          <Textarea value={relatedNotes} onChange={e => setRelatedNotes(e.target.value)} placeholder="Related SOPs / training / features (free text)" className="text-sm min-h-[40px]" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">Attachment (optional)</p>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 border border-[#E7E5E4] rounded-sm px-2 py-1 cursor-pointer hover:bg-stone-50">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {attachmentUrl ? 'Change file' : 'Add file'}
              <input type="file" className="hidden" onChange={e => e.target.files[0] && uploadFile(e.target.files[0])} disabled={uploading} />
            </label>
            {attachmentUrl && <a href={attachmentUrl} target="_blank" rel="noreferrer" className="ml-2 text-[11px] text-[#800020] underline">View file</a>}
          </div>

          <Button disabled={saving || !title.trim()} onClick={save} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm w-full h-9 text-sm">
            {sop ? 'Save Changes' : 'Create SOP'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}