import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, ExternalLink, GraduationCap, Link2, Plus, Radio, Video } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AtelierCard from '@/components/AtelierCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EMPTY = { title: '', description: '', presenter: '', starts_at: '', duration_minutes: '60', meeting_url: '', registration_url: '', status: 'Scheduled', audience: 'Everyone' };
const prettyDate = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Date to be announced';

export default function Webinars() {
  const [sessions, setSessions] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const load = () => base44.entities.Webinar.list('-starts_at', 200).then(setSessions).catch(() => setSessions([]));
  useEffect(() => { load(); }, []);
  const update = key => e => setForm(current => ({ ...current, [key]: e.target.value }));

  const save = async e => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await base44.entities.Webinar.create({
        ...form,
        duration_minutes: Number(form.duration_minutes) || 60,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
      });
      setForm(EMPTY); setOpen(false); await load();
    } catch (err) {
      setError('The session could not be saved. Check that the Webinar entity is enabled in your workspace and try again.');
    } finally { setSaving(false); }
  };

  const upcoming = (sessions || []).filter(s => s.status !== 'Cancelled' && (!s.starts_at || new Date(s.starts_at) >= new Date()));
  const past = (sessions || []).filter(s => s.status === 'Completed' || (s.starts_at && new Date(s.starts_at) < new Date() && s.status !== 'Cancelled'));

  return (
    <div className="p-5 md:p-8 max-w-[1180px] mx-auto min-w-0">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400 mb-2 flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" />Learning studio</p>
          <h1 className="font-display font-semibold text-[#1C1917] leading-none" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>Webinars & Training</h1>
          <p className="text-sm text-stone-500 mt-2 max-w-2xl">Plan live masterclasses, publish registration details and give learners one place to find their session links and learning resources.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm gap-2 self-start"><Plus className="w-4 h-4" /> Schedule a session</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-[#E7E5E4] p-4"><p className="text-[10px] uppercase tracking-widest text-stone-400">Upcoming sessions</p><p className="font-display text-3xl text-[#800020] mt-1">{upcoming.length}</p></div>
        <div className="bg-white border border-[#E7E5E4] p-4"><p className="text-[10px] uppercase tracking-widest text-stone-400">Completed</p><p className="font-display text-3xl text-[#1C1917] mt-1">{past.length}</p></div>
        <div className="bg-white border border-[#E7E5E4] p-4"><p className="text-[10px] uppercase tracking-widest text-stone-400">Learning resources</p><p className="font-display text-3xl text-[#1C1917] mt-1">Course library</p></div>
      </div>

      <AtelierCard title="Upcoming webinars & classes" className="mb-5">
        {sessions === null ? <p className="text-sm text-stone-400 py-6">Loading sessions…</p> : upcoming.length === 0 ? <div className="text-center py-10"><Radio className="w-8 h-8 text-stone-300 mx-auto mb-3"/><p className="text-sm text-stone-500">No sessions scheduled yet.</p><p className="text-xs text-stone-400 mt-1">Create a webinar or training class to publish it here.</p></div> : (
          <div className="grid md:grid-cols-2 gap-3">
            {upcoming.map(session => <article key={session.id} className="border border-[#E7E5E4] rounded-sm p-4 min-w-0">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-[10px] uppercase tracking-widest text-[#800020] font-semibold">{session.status || 'Scheduled'}</span><h3 className="font-display text-xl text-[#1C1917] mt-1 break-words">{session.title}</h3></div><Video className="w-5 h-5 text-[#800020] shrink-0"/></div>
              {session.description && <p className="text-xs text-stone-500 mt-2 whitespace-pre-line">{session.description}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500 mt-4"><span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5"/>{prettyDate(session.starts_at)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5"/>{session.duration_minutes || 60} min</span></div>
              <p className="text-[11px] text-stone-400 mt-2">Presenter: {session.presenter || 'Sewsiness Studio'} · {session.audience || 'Everyone'}</p>
              <div className="flex flex-wrap gap-2 mt-4">{session.meeting_url && <a href={session.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#800020] text-white text-xs rounded-sm hover:bg-[#6b0018]">Join session <ExternalLink className="w-3 h-3"/></a>}{session.registration_url && <a href={session.registration_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E7E5E4] text-xs rounded-sm hover:bg-[#FBF9F7]">Register <Link2 className="w-3 h-3"/></a>}</div>
            </article>)}
          </div>
        )}
      </AtelierCard>

      <AtelierCard title="Deliver training online">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div><Video className="w-5 h-5 text-[#800020] mb-2"/><p className="font-medium">Live masterclasses</p><p className="text-xs text-stone-500 mt-1">Add a Zoom, Google Meet or other live-room link to each session.</p></div>
          <div><GraduationCap className="w-5 h-5 text-[#800020] mb-2"/><p className="font-medium">Self-paced learning</p><p className="text-xs text-stone-500 mt-1">Use the Training and Trainees areas to manage curriculum, video lessons, quizzes and learner progress.</p></div>
          <div><Link2 className="w-5 h-5 text-[#800020] mb-2"/><p className="font-medium">Registration & replay links</p><p className="text-xs text-stone-500 mt-1">Share a registration page before the class and a recording or resource link afterwards.</p></div>
        </div>
      </AtelierCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">Schedule a webinar or class</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label>Session title</Label><Input required value={form.title} onChange={update('title')} placeholder="e.g. Advanced Corset Construction"/></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={update('description')} placeholder="What attendees will learn…"/></div>
            <div className="grid sm:grid-cols-2 gap-3"><div><Label>Presenter</Label><Input value={form.presenter} onChange={update('presenter')} placeholder="Trainer / host name"/></div><div><Label>Audience</Label><Input value={form.audience} onChange={update('audience')} placeholder="Everyone, members, trainees…"/></div></div>
            <div className="grid sm:grid-cols-2 gap-3"><div><Label>Date & time</Label><Input type="datetime-local" value={form.starts_at} onChange={update('starts_at')}/></div><div><Label>Duration (minutes)</Label><Input type="number" min="15" step="15" value={form.duration_minutes} onChange={update('duration_minutes')}/></div></div>
            <div><Label>Live meeting URL</Label><Input type="url" value={form.meeting_url} onChange={update('meeting_url')} placeholder="https://meet.google.com/…"/></div>
            <div><Label>Registration / replay URL (optional)</Label><Input type="url" value={form.registration_url} onChange={update('registration_url')} placeholder="https://…"/></div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <DialogFooter><Button type="submit" disabled={saving} className="bg-[#800020] hover:bg-[#6b0018] rounded-sm">{saving ? 'Publishing…' : 'Publish session'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
