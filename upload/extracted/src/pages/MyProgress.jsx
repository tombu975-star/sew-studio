import React, { useEffect, useMemo, useState } from 'react';
import { Plus, TrendingUp, PenLine, ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import PortfolioDialog from '@/components/portfolio/PortfolioDialog';
import CourseProgressList from '@/components/training/CourseProgressList';
import PerformanceBadge from '@/components/training/PerformanceBadge';
import { computePerformance } from '@/lib/performance';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const today = () => new Date().toISOString().slice(0, 10);

const LEVEL_STYLES = {
  Beginner: 'bg-stone-100 text-stone-600 border-stone-200',
  Practicing: 'bg-amber-50 text-amber-700 border-amber-200',
  Confident: 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30',
};

export default function MyProgress() {
  const [trainees, setTrainees] = useState(null);
  const [meId, setMeId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [reflecting, setReflecting] = useState(null);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [pieceOpen, setPieceOpen] = useState(false);

  useEffect(() => {
    base44.entities.Trainee.list().then(list => {
      setTrainees(list);
      setMeId(prev => prev || (list[0]?.id ?? null));
    }).catch(() => setTrainees([]));
  }, []);

  useEffect(() => {
    if (!meId) return;
    base44.entities.TrainingLog.list('-date', 300).then(setLogs).catch(() => setLogs([]));
    base44.entities.PortfolioItem.list('-completed_date', 200).then(setItems).catch(() => setItems([]));
    base44.entities.Course.list('sequence').then(setCourses).catch(() => setCourses([]));
    base44.entities.CourseProgress.filter({ trainee_id: meId }).then(setProgress).catch(() => setProgress([]));
  }, [meId]);

  const me = useMemo(() => (trainees || []).find(t => t.id === meId), [trainees, meId]);
  const myLogs = useMemo(() => logs.filter(l => l.trainee_id === meId), [logs, meId]);
  const performance = useMemo(() => computePerformance(myLogs), [myLogs]);
  const myPieces = useMemo(() => items.filter(i => i.trainee_id === meId), [items, meId]);
  const progressMap = useMemo(() => Object.fromEntries(progress.map(p => [p.course_id, p])), [progress]);

  const updateCourseStatus = async (courseId, status) => {
    const existing = progress.find(p => p.course_id === courseId);
    const payload = { status, completed_date: status === 'Completed' ? today() : undefined };
    if (existing) {
      const updated = await base44.entities.CourseProgress.update(existing.id, payload);
      setProgress(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } else {
      const created = await base44.entities.CourseProgress.create({ trainee_id: meId, course_id: courseId, ...payload });
      setProgress(prev => [...prev, created]);
    }
  };

  const recordQuizResult = async (courseId, videoTitle, res) => {
    const existing = progress.find(p => p.course_id === courseId);
    const entry = { video_title: videoTitle, score: res.score, total: res.total, passed: res.passed, date: today() };
    if (existing) {
      const updated = await base44.entities.CourseProgress.update(existing.id, { quiz_results: [...(existing.quiz_results || []), entry] });
      setProgress(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    } else {
      const created = await base44.entities.CourseProgress.create({ trainee_id: meId, course_id: courseId, quiz_results: [entry] });
      setProgress(prev => [...prev, created]);
    }
  };

  const openReflection = (entry) => {
    setReflecting(entry);
    setReflection(entry.trainee_reflection || '');
  };

  const saveReflection = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.TrainingLog.update(reflecting.id, { trainee_reflection: reflection });
      setLogs(prev => prev.map(l => (l.id === updated.id ? updated : l)));
      setReflecting(null);
    } finally { setSaving(false); }
  };

  const addPiece = async (data) => {
    await base44.entities.PortfolioItem.create({ ...data, trainee_id: meId, added_by_trainee: true });
    setPieceOpen(false);
    base44.entities.PortfolioItem.list('-completed_date', 200).then(setItems).catch(() => {});
  };

  if (!trainees) return <div className="p-10 text-stone-400 text-sm">Loading your progress…</div>;

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" />Your record</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>My Progress</h1>
          <p className="text-sm text-stone-500 mt-2">
            {me ? `${me.name} — ${me.program || 'Apprenticeship'}, ${me.stage || 'Foundation'} stage` : 'Your training journey and portfolio.'}
          </p>
          <div className="mt-2"><PerformanceBadge performance={performance} /></div>
        </div>
        {trainees.length > 1 && (
          <div className="self-start md:self-auto">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 block mb-1">Viewing as</span>
            <Select value={meId || undefined} onValueChange={setMeId}>
              <SelectTrigger className="w-52 rounded-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {trainees.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mb-4 md:mb-5">
        <CourseProgressList courses={courses} progressMap={progressMap} onStatusChange={updateCourseStatus} onQuizComplete={recordQuizResult} />
      </div>

      <AtelierCard title="Training Journey">
        {myLogs.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No sessions logged yet — your trainer adds an entry after each lesson.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {myLogs.map(e => (
              <div key={e.id} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-[#1C1917]">{e.skill_area || 'Training session'}</p>
                  <p className="text-xs text-stone-400 shrink-0">{formatDate(e.date)}</p>
                </div>
                {e.skill_level && <span className={`inline-flex px-2 py-0.5 mt-1 text-[10px] font-medium uppercase tracking-wide border rounded-sm ${LEVEL_STYLES[e.skill_level]}`}>{e.skill_level}</span>}
                {e.notes && <p className="text-xs text-stone-500 mt-1.5 whitespace-pre-line">{e.notes}</p>}
                {e.trainee_reflection ? (
                  <div className="mt-2 border-l-2 border-amber-300 pl-3">
                    <p className="text-[10px] uppercase tracking-wide text-stone-400">Your reflection</p>
                    <p className="text-xs text-stone-500 mt-0.5 italic whitespace-pre-line">{e.trainee_reflection}</p>
                  </div>
                ) : (
                  <button onClick={() => openReflection(e)} className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#800020] font-medium hover:underline">
                    <PenLine className="w-3 h-3" /> Add your reflection
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </AtelierCard>

      <div className="mt-4 md:mt-5">
        <AtelierCard
          title="My Portfolio"
          action={
            <Button onClick={() => setPieceOpen(true)} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm gap-1.5 h-7 px-2.5 text-[11px]"><Plus className="w-3 h-3" /> Add Piece</Button>
          }
        >
          {myPieces.length === 0 ? (
            <p className="text-sm text-stone-400 py-6 text-center">Photograph your practice pieces and add them here — they're clearly marked as yours.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myPieces.map(p => (
                <div key={p.id} className="border border-[#E7E5E4] rounded-sm overflow-hidden">
                  <div className="aspect-[3/4] bg-[#F3F1EF]">
                    {p.image_url ? <Image src={p.image_url} className="w-full h-full" fittingType="fill" /> : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 gap-1.5"><ImageIcon className="w-6 h-6" /><span className="text-[9px]">No photo</span></div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium text-[#1C1917] truncate">{p.title}</p>
                    {p.added_by_trainee && <span className="inline-flex mt-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide border rounded-sm bg-teal-50 text-teal-700 border-teal-200">Added by trainee</span>}
                    {p.trainer_feedback && (
                      <div className="mt-1.5 border-l-2 border-amber-300 pl-2">
                        <p className="text-[9px] uppercase tracking-wide text-stone-400">Trainer feedback{p.trainer_score ? ` · ${p.trainer_score}/5` : ''}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5 italic">{p.trainer_feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AtelierCard>
      </div>

      <Dialog open={!!reflecting} onOpenChange={v => !v && setReflecting(null)}>
        <DialogContent className="rounded-sm max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Your reflection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-stone-500">{reflecting?.skill_area}{reflecting && ` — ${formatDate(reflecting.date)}`}</p>
            <div>
              <Label>What did you learn or find difficult?</Label>
              <Textarea rows={4} value={reflection} onChange={e => setReflection(e.target.value)} className="mt-1.5" placeholder="In your own words — your trainer can read but not edit this." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveReflection} disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] text-white rounded-sm">{saving ? 'Saving…' : 'Save reflection'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PortfolioDialog open={pieceOpen} onClose={() => setPieceOpen(false)} onSave={addPiece} />
    </div>
  );
}