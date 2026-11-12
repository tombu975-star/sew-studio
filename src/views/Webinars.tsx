"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, BookOpen, CalendarDays, Clock3, ExternalLink, GraduationCap, Link2, MessageSquare, Pencil, Plus, Radio, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { api, apiGet, apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useNav } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { MetricCard } from "@/components/atelier/MetricCard";
import { EmptyState } from "@/components/atelier/EmptyState";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Session = {
  id: string; title: string; description: string; presenter: string; kind: "Webinar" | "Class" | "Training";
  startsAt: string | null; durationMinutes: number; meetingUrl: string; registrationUrl: string;
  status: "Scheduled" | "Live" | "Completed" | "Cancelled"; audience: "Everyone" | "Staff" | "Trainers" | "Trainees";
};
type Form = { title: string; description: string; presenter: string; kind: string; audience: string; startsAt: string; durationMinutes: string; meetingUrl: string; registrationUrl: string };

const EMPTY: Form = { title: "", description: "", presenter: "", kind: "Webinar", audience: "Everyone", startsAt: "", durationMinutes: "60", meetingUrl: "", registrationUrl: "" };
const KINDS = ["Webinar", "Class", "Training"];
const AUDIENCES = ["Everyone", "Staff", "Trainers", "Trainees"];
const select = "h-10 w-full rounded-lg border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-4 focus:ring-[#650019]/10";

const STATUS_STYLE: Record<Session["status"], string> = {
  Scheduled: "bg-[#FBF1F3] text-[#650019] border-[#E6C3CB]",
  Live: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Completed: "bg-stone-100 text-stone-700 border-stone-200",
  Cancelled: "bg-red-50 text-red-800 border-red-200",
};

const pretty = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Date to be announced");
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
/** Links are validated on save; this guards the display too. */
const safeHref = (url: string) => (/^https?:\/\//i.test(url) ? url : undefined);

/** Live webinars, classes and training sessions, with join and replay links. */
export default function Webinars() {
  const qc = useQueryClient();
  const { go } = useNav();
  const { role } = useRole();
  const canSchedule = role === "madam" || role === "trainer";
  const { data: sessions, isLoading } = useQuery<Session[]>({ queryKey: ["webinars"], queryFn: () => apiGet<Session[]>("/api/webinars") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["webinars"] });
  const onError = (e: Error) => toast.error(e.message);

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [editing, setEditing] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const list = sessions ?? [];
    const isPast = (s: Session) => s.status === "Completed" || (s.status !== "Live" && s.startsAt !== null && Date.parse(s.startsAt) < now - s.durationMinutes * 60000);
    const up = list.filter((s) => s.status !== "Cancelled" && !isPast(s)).sort((a, b) => (Date.parse(a.startsAt ?? "") || Infinity) - (Date.parse(b.startsAt ?? "") || Infinity));
    const ps = list.filter((s) => s.status === "Cancelled" || isPast(s)).sort((a, b) => (Date.parse(b.startsAt ?? "") || 0) - (Date.parse(a.startsAt ?? "") || 0));
    return { upcoming: up, past: ps };
  }, [sessions]);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, durationMinutes: Number(form.durationMinutes) || 60 };
      return editing ? apiPatch(`/api/webinars/${editing.id}`, body) : apiPost("/api/webinars", body);
    },
    onSuccess: () => { toast.success(editing ? "Session updated" : "Session published"); setOpen(false); refresh(); },
    onError,
  });
  const setStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch(`/api/webinars/${id}`, { status }), onSuccess: refresh, onError });
  const remove = useMutation({ mutationFn: (id: string) => api(`/api/webinars/${id}`, { method: "DELETE" }), onSuccess: () => { toast.success("Session deleted"); refresh(); }, onError });

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({ title: s.title, description: s.description, presenter: s.presenter, kind: s.kind, audience: s.audience, startsAt: toLocalInput(s.startsAt), durationMinutes: String(s.durationMinutes), meetingUrl: s.meetingUrl, registrationUrl: s.registrationUrl });
    setOpen(true);
  };

  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="p-5 md:p-8 max-w-[1180px] mx-auto w-full min-w-0">
      <PageHeader
        eyebrow="Learning studio" eyebrowIcon={GraduationCap} title="Webinars & Training"
        subtitle="Live webinars, classes and training sessions, with the link to join and a replay or registration link."
        actions={canSchedule ? <PremiumButton onClick={openNew}><Plus className="size-4" /> Schedule a session</PremiumButton> : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <MetricCard label="UPCOMING" value={String(upcoming.length)} accent />
        <MetricCard label="COMPLETED OR PAST" value={String(past.length)} />
        <MetricCard label="LIVE NOW" value={String((sessions ?? []).filter((s) => s.status === "Live").length)} />
      </div>

      <div role="tablist" aria-label="Sessions" className="mb-4 inline-flex rounded-lg border border-[#E6D4D8] bg-white p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("rounded-md px-4 py-1.5 text-sm font-medium", tab === t ? "bg-[#650019] text-white" : "text-stone-600 hover:bg-[#FBF1F3]")}>
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-sm text-stone-500">Loading sessions…</p> : shown.length === 0 ? (
        <SectionCard>
          <EmptyState icon={Radio} title={tab === "upcoming" ? "No sessions scheduled yet" : "No past sessions"}
            description={canSchedule ? "Schedule a webinar, class or training session to publish it here." : "Your studio has not scheduled anything yet. Check back soon."}
            action={canSchedule && tab === "upcoming" ? <PremiumButton size="sm" onClick={openNew}><Plus className="size-4" /> Schedule a session</PremiumButton> : undefined} />
        </SectionCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {shown.map((s) => (
            <article key={s.id} className="min-w-0 rounded-xl border border-[#E6D4D8] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[s.status])}>{s.status}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#650019]">{s.kind}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-semibold text-[#2F151B] break-words">{s.title}</h3>
                </div>
                <Video className="size-5 shrink-0 text-[#650019]" />
              </div>
              {s.description && <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{s.description}</p>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{pretty(s.startsAt)}</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{s.durationMinutes} min</span>
              </div>
              <p className="mt-2 text-xs text-stone-600">Presenter: {s.presenter || "Your studio"} · For: {s.audience}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {safeHref(s.meetingUrl) && s.status !== "Cancelled" && (
                  <a href={safeHref(s.meetingUrl)} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#650019] px-3 text-sm font-semibold text-white hover:bg-[#4A0010]">
                    {s.status === "Live" ? "Join now" : "Join session"} <ExternalLink className="size-3.5" />
                  </a>
                )}
                {safeHref(s.registrationUrl) && (
                  <a href={safeHref(s.registrationUrl)} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D2B9BF] px-3 text-sm font-medium text-[#650019] hover:bg-[#FBF1F3]">
                    {s.status === "Completed" ? "Replay" : "Register"} <Link2 className="size-3.5" />
                  </a>
                )}
                {canSchedule && (
                  <span className="ml-auto flex items-center gap-1">
                    {s.status === "Scheduled" && <PremiumButton size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: "Live" })}>Go live</PremiumButton>}
                    {(s.status === "Scheduled" || s.status === "Live") && <PremiumButton size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: "Completed" })}>Mark done</PremiumButton>}
                    {s.status === "Scheduled" && <PremiumButton size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: s.id, status: "Cancelled" })}>Cancel</PremiumButton>}
                    <button type="button" aria-label="Edit session" onClick={() => openEdit(s)} className="grid size-9 place-items-center rounded-md text-stone-500 hover:bg-[#FBF1F3] hover:text-[#650019]"><Pencil className="size-4" /></button>
                    <button type="button" aria-label="Delete session" onClick={() => { if (window.confirm(`Delete "${s.title}"?`)) remove.mutate(s.id); }} className="grid size-9 place-items-center rounded-md text-stone-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <SectionCard title="More ways to learn" className="mt-6">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Curriculum", text: "Self-paced lessons, units and quizzes.", to: "curriculum" as const },
            { icon: GraduationCap, title: "Progress & training log", text: "Training sessions and how each trainee is doing.", to: "progress" as const },
            { icon: Award, title: "Certificates", text: "Certificates for finished programmes.", to: "certificate" as const },
            { icon: MessageSquare, title: "Community", text: "Ask questions and share with the studio.", to: "community" as const },
          ].map(({ icon: Icon, title, text, to }) => (
            <button key={to} type="button" onClick={() => go(to)} className="rounded-lg border border-[#E6D4D8] p-4 text-left hover:border-[#C98A99] hover:bg-[#FBF1F3]">
              <Icon className="size-5 text-[#650019]" />
              <p className="mt-2 text-sm font-semibold text-[#2F151B]">{title}</p>
              <p className="mt-1 text-xs text-stone-600">{text}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing ? "Edit session" : "Schedule a session"}</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div><Label htmlFor="w-title">Session title</Label><Input id="w-title" required maxLength={150} value={form.title} onChange={set("title")} placeholder="e.g. Advanced corset construction" /></div>
            <div><Label htmlFor="w-desc">Description</Label><Textarea id="w-desc" rows={3} maxLength={2000} value={form.description} onChange={set("description")} placeholder="What attendees will learn…" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="w-kind">Type</Label><select id="w-kind" className={select} value={form.kind} onChange={set("kind")}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
              <div><Label htmlFor="w-aud">Who can see it</Label><select id="w-aud" className={select} value={form.audience} onChange={set("audience")}>{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</select></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="w-pres">Presenter</Label><Input id="w-pres" maxLength={100} value={form.presenter} onChange={set("presenter")} placeholder="Trainer or host name" /></div>
              <div><Label htmlFor="w-dur">Duration (minutes)</Label><Input id="w-dur" type="number" min={5} max={1440} step={5} value={form.durationMinutes} onChange={set("durationMinutes")} /></div>
            </div>
            <div><Label htmlFor="w-when">Date and time</Label><Input id="w-when" type="datetime-local" value={form.startsAt} onChange={set("startsAt")} /></div>
            <div><Label htmlFor="w-meet">Live meeting link</Label><Input id="w-meet" type="url" value={form.meetingUrl} onChange={set("meetingUrl")} placeholder="https://meet.google.com/…" /></div>
            <div><Label htmlFor="w-reg">Registration or replay link (optional)</Label><Input id="w-reg" type="url" value={form.registrationUrl} onChange={set("registrationUrl")} placeholder="https://…" /></div>
            <DialogFooter><PremiumButton type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : editing ? "Save changes" : "Publish session"}</PremiumButton></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
