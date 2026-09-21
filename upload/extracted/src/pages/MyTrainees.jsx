import React, { useEffect, useMemo, useState } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import { useRole } from '@/lib/roles';
import { base44 } from '@/api/base44Client';
import { fetchUsers } from '@/lib/data';
import { recommendNextCourse } from '@/lib/training';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import TraineeDialog from '@/components/training/TraineeDialog';
import TraineeRow from '@/components/training/TraineeRow';
import CurriculumManager from '@/components/training/CurriculumManager';
import SubmissionsToReview from '@/components/training/SubmissionsToReview';
import TrainerInsights from '@/components/training/TrainerInsights';
import { computePerformance } from '@/lib/performance';

export default function MyTrainees() {
  const { role, user } = useRole();
  const [trainees, setTrainees] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [dialog, setDialog] = useState(false);

  const load = () => base44.entities.Trainee.list().then(setTrainees).catch(console.error);
  const loadCourses = () => base44.entities.Course.list('sequence').then(setCourses).catch(() => setCourses([]));
  const loadPortfolio = () => base44.entities.PortfolioItem.filter({ added_by_trainee: true }).then(setPortfolio).catch(() => setPortfolio([]));

  useEffect(() => {
    load();
    loadCourses();
    loadPortfolio();
    base44.entities.TrainingLog.list().then(setLogs).catch(() => setLogs([]));
    base44.entities.CourseProgress.list().then(setProgress).catch(() => setProgress([]));
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const rows = useMemo(() => (trainees || []).map(t => {
    const mine = logs.filter(l => l.trainee_id === t.id);
    const last = mine.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
    const days = last?.date ? Math.floor((Date.now() - new Date(last.date)) / 86400000) : null;
    const myProgress = progress.filter(p => p.trainee_id === t.id);
    return { t, last, days, stale: last === null || days > 14, performance: computePerformance(mine), recommended: recommendNextCourse(courses, myProgress) };
  }).sort((a, b) => (a.t.name || '').localeCompare(b.t.name || '')), [trainees, logs, progress, courses]);

  const visible = role === 'trainer' && user ? rows.filter(r => r.t.trainer_id === user.id) : rows;
  const visibleTraineeIds = useMemo(() => new Set(visible.map(r => r.t.id)), [visible]);
  const traineeMap = useMemo(() => Object.fromEntries((trainees || []).map(t => [t.id, t])), [trainees]);

  const pendingSubmissions = useMemo(
    () => portfolio.filter(p => !p.trainer_feedback && visibleTraineeIds.has(p.trainee_id)),
    [portfolio, visibleTraineeIds]
  );

  const addTrainee = async (data) => {
    await base44.entities.Trainee.create(data);
    setDialog(false);
    load();
  };

  const saveCourse = async (data, id) => {
    if (id) await base44.entities.Course.update(id, data);
    else await base44.entities.Course.create(data);
    loadCourses();
  };

  const saveReview = async (id, data) => {
    await base44.entities.PortfolioItem.update(id, { ...data, reviewed_by: user?.id, reviewed_date: new Date().toISOString().slice(0, 10) });
    loadPortfolio();
  };

  if (!trainees) return <div className="p-10 text-stone-400 text-sm">Loading trainees…</div>;

  return (
    <div className="p-5 md:p-8 max-w-[900px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><UserCheck className="w-3.5 h-3.5" />Training</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>{role === 'trainer' ? 'My Trainees' : 'Trainees'}</h1>
          <p className="text-sm text-stone-500 mt-2">Apprenticeships and master-class attendees{role === 'trainer' ? ' you teach' : ''}.</p>
        </div>
        <Button onClick={() => setDialog(true)} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm gap-1.5 self-start md:self-auto"><Plus className="w-4 h-4" /> Add Trainee</Button>
      </div>

      <TrainerInsights rows={visible} pendingCount={pendingSubmissions.length} pendingNames={pendingSubmissions.map(p => traineeMap[p.trainee_id]?.name || 'A trainee')} />

      <div className="mb-4 md:mb-5">
        <CurriculumManager courses={courses} onSave={saveCourse} />
      </div>

      <div className="mb-4 md:mb-5">
        <SubmissionsToReview items={pendingSubmissions} traineeMap={traineeMap} onSaveReview={saveReview} />
      </div>

      <AtelierCard title={`${visible.length} trainee${visible.length !== 1 ? 's' : ''}`}>
        {visible.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No trainees yet.</p>
        ) : (
          <div className="divide-y divide-[#E7E5E4]">
            {visible.map(({ t, last, days, stale, performance, recommended }) => (
              <TraineeRow key={t.id} t={t} last={last} days={days} stale={stale} performance={performance} recommended={recommended} trainerName={userMap[t.trainer_id]?.full_name} />
            ))}
          </div>
        )}
      </AtelierCard>

      <TraineeDialog open={dialog} onClose={() => setDialog(false)} onSave={addTrainee} />
    </div>
  );
}