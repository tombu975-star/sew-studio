import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Upload, Video, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const EMPTY = { name: '', description: '', sequence: '', videos: [] };
const EMPTY_QUESTION = { question: '', options: ['', '', '', ''], correct_index: 0 };

export default function CourseDialog({ open, course, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [quizVideoIdx, setQuizVideoIdx] = useState(null);
  const [newQuestion, setNewQuestion] = useState(EMPTY_QUESTION);

  useEffect(() => {
    if (open) {
      setForm(course ? { name: course.name || '', description: course.description || '', sequence: course.sequence ?? '', videos: course.videos || [] } : EMPTY);
      setNewVideoTitle('');
      setNewVideoUrl('');
      setQuizVideoIdx(null);
      setNewQuestion(EMPTY_QUESTION);
    }
  }, [open, course]);

  const addQuizQuestion = (videoIdx) => {
    if (!newQuestion.question.trim() || newQuestion.options.some(o => !o.trim())) return;
    setForm(f => ({
      ...f,
      videos: f.videos.map((v, i) => i === videoIdx ? { ...v, quiz: [...(v.quiz || []), newQuestion] } : v),
    }));
    setNewQuestion(EMPTY_QUESTION);
  };

  const removeQuizQuestion = (videoIdx, qIdx) => {
    setForm(f => ({
      ...f,
      videos: f.videos.map((v, i) => i === videoIdx ? { ...v, quiz: v.quiz.filter((_, qi) => qi !== qIdx) } : v),
    }));
  };

  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    setForm(f => ({ ...f, videos: [...f.videos, { title: newVideoTitle.trim() || `Video ${f.videos.length + 1}`, url: newVideoUrl.trim() }] }));
    setNewVideoTitle('');
    setNewVideoUrl('');
  };

  const removeVideo = (idx) => {
    setForm(f => ({ ...f, videos: f.videos.filter((_, i) => i !== idx) }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, videos: [...f.videos, { title: newVideoTitle.trim() || file.name, url: file_url }] }));
      setNewVideoTitle('');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ name: form.name, description: form.description, sequence: form.sequence === '' ? undefined : Number(form.sequence), videos: form.videos }, course?.id);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-sm max-w-md">
        <DialogHeader><DialogTitle className="font-display text-2xl">{course ? 'Edit Skill Module' : 'New Skill Module'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Module name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bodice Boning" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What this module covers…" /></div>
          <div><Label>Order in curriculum</Label><Input type="number" value={form.sequence} onChange={e => setForm({ ...form, sequence: e.target.value })} placeholder="Lower appears first" /></div>

          <div>
            <Label>Training videos</Label>
            {form.videos.length > 0 && (
              <div className="mt-1.5 space-y-1.5">
                {form.videos.map((v, i) => (
                  <div key={i} className="bg-[#FBF9F7] border border-[#E7E5E4] rounded-sm">
                    <div className="flex items-center gap-2 px-2.5 py-1.5">
                      <Video className="w-3.5 h-3.5 text-[#800020] shrink-0" />
                      <span className="text-xs text-[#1C1917] truncate flex-1">{v.title}</span>
                      <button type="button" onClick={() => setQuizVideoIdx(quizVideoIdx === i ? null : i)} className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-[#800020] shrink-0">
                        <HelpCircle className="w-3.5 h-3.5" /> Quiz ({v.quiz?.length || 0}) {quizVideoIdx === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button type="button" onClick={() => removeVideo(i)} className="text-stone-400 hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {quizVideoIdx === i && (
                      <div className="px-2.5 pb-2.5 pt-1 border-t border-[#E7E5E4] space-y-2">
                        {(v.quiz || []).map((q, qi) => (
                          <div key={qi} className="flex items-start justify-between gap-2 bg-white border border-[#E7E5E4] rounded-sm px-2 py-1.5">
                            <div className="text-[11px] text-[#1C1917] flex-1">
                              <p className="font-medium">{qi + 1}. {q.question}</p>
                              <p className="text-stone-400 mt-0.5">Correct: {q.options[q.correct_index]}</p>
                            </div>
                            <button type="button" onClick={() => removeQuizQuestion(i, qi)} className="text-stone-400 hover:text-destructive shrink-0"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <div className="space-y-1.5 pt-1">
                          <Input value={newQuestion.question} onChange={e => setNewQuestion(q => ({ ...q, question: e.target.value }))} placeholder="Quiz question" className="text-xs h-8" />
                          {newQuestion.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1.5">
                              <input type="radio" name={`correct-${i}`} checked={newQuestion.correct_index === oi} onChange={() => setNewQuestion(q => ({ ...q, correct_index: oi }))} />
                              <Input
                                value={opt}
                                onChange={e => setNewQuestion(q => ({ ...q, options: q.options.map((o, idx) => idx === oi ? e.target.value : o) }))}
                                placeholder={`Option ${oi + 1}`}
                                className="text-xs h-8"
                              />
                            </div>
                          ))}
                          <p className="text-[10px] text-stone-400">Select the radio button next to the correct answer.</p>
                          <Button type="button" size="sm" variant="outline" onClick={() => addQuizQuestion(i)} className="rounded-sm h-7 text-[11px]"><Plus className="w-3 h-3 mr-1" /> Add Question</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 space-y-1.5">
              <Input value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} placeholder="Video title (optional)" className="text-xs" />
              <div className="flex gap-1.5">
                <Input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="Paste a video URL…" className="text-xs" />
                <Button type="button" onClick={addVideo} variant="outline" className="rounded-sm shrink-0 h-9 px-2.5"><Plus className="w-3.5 h-3.5" /></Button>
              </div>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-[#800020] font-medium cursor-pointer hover:underline">
                <Upload className="w-3 h-3" /> {uploading ? 'Uploading…' : 'Or upload a video file'}
                <input type="file" accept="video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Save Module'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}