import React, { useEffect, useMemo, useState } from 'react';
import { Plus, GraduationCap } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function TrainingLog() {
  const { role, user } = useRole();
  const [entries, setEntries] = useState(null);
  const [trainees, setTrainees] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ trainee_id: '', date: today(), skill_area: '', notes: '', skill_level: 'Practicing' });

  const load = () => base44.entities.TrainingLog.list('-date', 300).then(setEntries).catch(console.error);

  useEffect(() => {
    load();
    base44.entities.Trainee.list().then(setTrainees).catch(() => setTrainees([]));
  }, []);

  const traineeMap = useMemo(() => Object.fromEntries(trainees.map(t => [t.id, t])), [trainees]);
  const myTraineeIds = useMemo(() => new Set(trainees.filter(t => t.trainer_id === user?.id).map(t => t.id)), [trainees, user]);
  const visible = role === 'trainer' && user ? (entries || []).filter(e => myTraineeIds.has(e.trainee_id)) : (entries || []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.trainee_id) {
      setError('Choose a trainee.');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.TrainingLog.create({
        trainee_id: form.trainee_id,
        date: form.date,
        skill_area: form.skill_area,
        notes: form.notes || undefined,
        skill_level: form.skill_level,
      });
      setOpen(false);
      setForm({ trainee_id: '', date: today(), skill_area: '', notes: '', skill_level: 'Practicing' });
      await load();
    } catch {
      setError('Could not save the entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const emptyMsg = trainees.length === 0
    ? 'No trainees yet — add one from the Trainees screen.'
    : 'No training sessions logged yet.';

  const courses = useMemo(() => {
    const map = {};
    visible.forEach(e => {
      if (!e.skill_area) return;
      if (!map[e.skill_area]) map[e.skill_area] = { name: e.skill_area, sessions: 0, traineeIds: new Set() };
      map[e.skill_area].sessions += 1;
      if (e.trainee_id) map[e.skill_area].traineeIds.add(e.trainee_id);
    });
    return Object.values(map)
      .map(c => ({ ...c, traineeCount: c.traineeIds.size }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [visible]);

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" />Apprenticeship</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>Training Log</h1>
          <p className="text-sm text-stone-500 mt-2">{role === 'trainer' ? 'Sessions with the trainees you supervise.' : 'Every apprenticeship and master-class session, in one place.'}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm gap-1.5 self-start md:self-auto"><Plus className="w-4 h-4" /> Log Session</Button>
      </div>

      {courses.length > 0 && (
        <AtelierCard title="Courses Covered" className="mb-4 md:mb-5">
          <div className="flex flex-wrap gap-2">
            {courses.map(c => (
              <span key={c.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-[#E7E5E4] rounded-sm text-[#1C1917]">
                {c.name}
                <span className="text-stone-400">· {c.sessions} session{c.sessions !== 1 ? 's' : ''} · {c.traineeCount} trainee{c.traineeCount !== 1 ? 's' : ''}</span>
              </span>
            ))}
          </div>
        </AtelierCard>
      )}

      {visible.length === 0 ? (
        <AtelierCard title="Entries">
          <p className="text-sm text-stone-400 py-6 text-center">{emptyMsg}</p>
        </AtelierCard>
      ) : (
        <AtelierCard title={role === 'trainer' ? 'My Sessions' : 'All Sessions'}>
          <div className="divide-y divide-[#E7E5E4]">
            {visible.map(e => (
              <div key={e.id} className="py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-[#1C1917]">{e.skill_area || 'Training session'}</p>
                  <p className="text-xs text-stone-400 shrink-0">{formatDate(e.date)}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-[11px] text-[#800020] font-medium">{traineeMap[e.trainee_id]?.name || 'Trainee'}</p>
                  {e.skill_level && <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border rounded-sm ${LEVEL_STYLES[e.skill_level]}`}>{e.skill_level}</span>}
                </div>
                {e.notes && <p className="text-xs text-stone-500 mt-1 leading-relaxed whitespace-pre-line">{e.notes}</p>}
                {e.trainee_reflection && (
                  <div className="mt-2 border-l-2 border-amber-300 pl-3">
                    <p className="text-[10px] uppercase tracking-wide text-stone-400">Trainee's reflection</p>
                    <p className="text-xs text-stone-500 mt-0.5 italic whitespace-pre-line">{e.trainee_reflection}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </AtelierCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">New training session</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Trainee</Label>
              <Select value={form.trainee_id || undefined} onValueChange={v => setForm(f => ({ ...f, trainee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose trainee" /></SelectTrigger>
                <SelectContent>
                  {trainees.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={set('date')} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Skill level at this session</Label>
                <Select value={form.skill_level} onValueChange={v => setForm(f => ({ ...f, skill_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Practicing">Practicing</SelectItem>
                    <SelectItem value="Confident">Confident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Skill / topic taught</Label>
              <Input value={form.skill_area} onChange={set('skill_area')} placeholder="e.g. Bodice boning, hand-beading" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Trainer notes</Label>
              <Textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="What was taught or observed…" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm">{saving ? 'Saving…' : 'Save session'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}