"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { api, apiErrorMessage, apiGet } from "@/lib/api";
import { uploadFile, videoDuration } from "./upload";

type CourseRow = { id: string; slug: string; title: string; subtitle: string | null; level: string; published: boolean; lessonCount: number; learners: number; certificates: number };
type Quiz = { q: string; options: string[]; correct: number; explain?: string };
type Lesson = { id: string; section: string; position: number; title: string; kind: "video" | "reading" | "quiz"; summary: string; body: string; mediaId: string | null; captionsMediaId: string | null; durationSeconds: number; quiz: Quiz[] | null; isPreview: boolean; mediaName: string | null };
type Course = { id: string; slug: string; title: string; subtitle: string; description: string; level: string; category: string; coverMediaId: string | null; accent: string; passMark: number; certificateEnabled: boolean; published: boolean; lessons: Lesson[] };
type Live = { id: string; title: string; startsAt: string | null; status: string; delivery: "external" | "onsite"; mediaId: string | null; captionsMediaId: string | null; mediaName: string | null; openQuestions: number };
type LessonForm = { id: string | null; kind: Lesson["kind"]; title: string; section: string; summary: string; body: string; isPreview: boolean; mediaId: string | null; captionsMediaId: string | null; durationSeconds: number; quiz: Quiz[] };

const input = "mt-1.5 h-11 w-full rounded-lg border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-4 focus:ring-[#650019]/10";
const area = "mt-1.5 w-full rounded-lg border border-[#D2B9BF] bg-white px-3 py-2 text-sm outline-none focus:border-[#650019] focus:ring-4 focus:ring-[#650019]/10";
const card = "rounded-2xl border border-[#E6D4D8] bg-white p-5 shadow-sm sm:p-7";
const ghost = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D2B9BF] px-3 text-xs font-semibold text-[#650019] hover:bg-[#FBF1F3] disabled:opacity-50";
const primary = "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#650019] px-5 text-sm font-semibold text-white hover:bg-[#4A0010] disabled:opacity-50";
const blankQuestion = (): Quiz => ({ q: "", options: ["", ""], correct: 0 });
const blankLesson = (): LessonForm => ({ id: null, kind: "video", title: "", section: "Lessons", summary: "", body: "", isPreview: false, mediaId: null, captionsMediaId: null, durationSeconds: 0, quiz: [blankQuestion()] });

/** Pick a file, upload it to this platform, and report back the stored file's id. */
function FilePicker({ label, kind, accept, current, onDone, onDuration }: { label: string; kind: "video" | "captions" | "image"; accept: string; current: string | null; onDone: (id: string) => void; onDuration?: (s: number) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState("");
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setErr(""); setPct(0);
    try {
      if (onDuration) onDuration(await videoDuration(file));
      onDone(await uploadFile(file, kind, setPct));
    } catch (x) { setErr(apiErrorMessage(x, "Upload failed.")); }
    finally { setPct(null); }
  }
  return (
    <div className="mt-3">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <label className={`${ghost} cursor-pointer`}><Upload className="size-3.5" /> {current ? "Replace file" : "Choose file"}<input type="file" accept={accept} onChange={pick} className="sr-only" disabled={pct !== null} /></label>
        {pct !== null && <span className="flex items-center gap-2 text-xs text-stone-600"><Loader2 className="size-3.5 animate-spin" /> Uploading {Math.round(pct * 100)}%. Keep this page open.</span>}
        {pct === null && current && <span className="text-xs font-semibold text-emerald-700">File attached</span>}
      </div>
      {err && <p role="alert" className="mt-1 text-xs text-red-700">{err}</p>}
    </div>
  );
}

export function AcademyAdmin() {
  const [auth, setAuth] = useState<"checking" | "yes" | "no">("checking");
  const [tab, setTab] = useState<"courses" | "live">("courses");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [live, setLive] = useState<Live[]>([]);
  const [lesson, setLesson] = useState<LessonForm | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const fail = (e: unknown, f: string) => { setErr(apiErrorMessage(e, f)); setMsg(""); };
  const loadCourses = useCallback(async () => { try { setCourses(await apiGet<CourseRow[]>("/api/admin/academy/courses")); } catch (e) { fail(e, "Could not load courses."); } }, []);
  const loadLive = useCallback(async () => { try { setLive(await apiGet<Live[]>("/api/admin/academy/live")); } catch (e) { fail(e, "Could not load live sessions."); } }, []);
  const open = useCallback(async (id: string) => { try { setCourse(await apiGet<Course>(`/api/admin/academy/courses/${id}`)); setLesson(null); } catch (e) { fail(e, "Could not open the course."); } }, []);
  useEffect(() => { apiGet("/api/admin-auth/me").then(() => setAuth("yes")).catch(() => setAuth("no")); }, []);
  useEffect(() => { if (auth === "yes") { void loadCourses(); void loadLive(); } }, [auth, loadCourses, loadLive]);

  async function run(fn: () => Promise<void>, ok: string) { setBusy(true); setErr(""); try { await fn(); setMsg(ok); } catch (e) { fail(e, "That did not work."); } finally { setBusy(false); } }
  const patchCourse = (body: object, ok = "Saved.") => run(async () => { await api(`/api/admin/academy/courses/${course!.id}`, { method: "PATCH", body: JSON.stringify(body) }); await open(course!.id); await loadCourses(); }, ok);

  if (auth === "checking") return <div className="grid min-h-dvh place-items-center"><Loader2 className="size-6 animate-spin text-[#650019]" /></div>;
  if (auth === "no") return <div className="mx-auto max-w-md p-10 text-center text-sm">Sign in as a platform admin first. <a className="font-semibold text-[#650019] underline" href="/admin">Go to admin sign-in</a></div>;

  const move = (i: number, d: number) => run(async () => {
    const list = [...course!.lessons]; const j = i + d; if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await Promise.all(list.map((l, idx) => api(`/api/admin/academy/lessons/${l.id}`, { method: "PATCH", body: JSON.stringify({ position: idx }) })));
    await open(course!.id);
  }, "Order saved.");

  const saveLesson = () => run(async () => {
    const f = lesson!;
    const body = { kind: f.kind, title: f.title, section: f.section, summary: f.summary, body: f.body, isPreview: f.isPreview, mediaId: f.mediaId, captionsMediaId: f.captionsMediaId, durationSeconds: f.durationSeconds, quiz: f.kind === "quiz" ? f.quiz : null };
    if (f.id) await api(`/api/admin/academy/lessons/${f.id}`, { method: "PATCH", body: JSON.stringify(body) });
    else await api(`/api/admin/academy/courses/${course!.id}/lessons`, { method: "POST", body: JSON.stringify(body) });
    await open(course!.id); await loadCourses(); setLesson(null);
  }, "Lesson saved.");

  const editLesson = (l: Lesson) => setLesson({ id: l.id, kind: l.kind, title: l.title, section: l.section, summary: l.summary, body: l.body, isPreview: l.isPreview, mediaId: l.mediaId, captionsMediaId: l.captionsMediaId, durationSeconds: l.durationSeconds, quiz: l.quiz?.length ? l.quiz : [blankQuestion()] });
  const setQ = (i: number, patch: Partial<Quiz>) => setLesson((f) => f && { ...f, quiz: f.quiz.map((q, k) => (k === i ? { ...q, ...patch } : q)) });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl font-semibold text-[#2F151B]">Sewsiness Academy</h1><p className="mt-1 text-sm text-stone-600">Courses, videos and live classes. Everything is stored and played on this platform.</p></div>
        <div className="flex gap-2"><a href="/academy" target="_blank" rel="noreferrer" className={ghost}>View Academy <ExternalLink className="size-3.5" /></a><a href="/admin" className={ghost}>Back to admin</a></div>
      </header>
      {err && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}
      {msg && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p>}
      <div role="tablist" className="inline-flex rounded-lg border border-[#E6D4D8] bg-white p-1">
        {(["courses", "live"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-[#650019] text-white" : "text-stone-600 hover:bg-[#FBF1F3]"}`}>{t === "courses" ? "Courses" : "Live classroom"}</button>)}
      </div>

      {tab === "courses" && !course && (
        <>
          <form className={`${card} flex flex-wrap items-end gap-3`} onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await api<{ id: string }>("/api/admin/academy/courses", { method: "POST", body: JSON.stringify({ title: newTitle }) }); setNewTitle(""); await loadCourses(); await open(r.id); }, "Course created. Add lessons below."); }}>
            <label className="min-w-0 flex-1 text-sm font-medium text-stone-700">New course title<input required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={150} className={input} placeholder="e.g. Price every job properly" /></label>
            <button disabled={busy} className={primary}><Plus className="size-4" /> Create course</button>
          </form>
          <ul className="space-y-3">
            {courses.length === 0 && <li className={`${card} text-sm text-stone-600`}>No courses yet. Create the first one above.</li>}
            {courses.map((c) => (
              <li key={c.id} className={`${card} flex flex-wrap items-center gap-4`}>
                <div className="min-w-0 flex-1"><p className="font-semibold text-[#2F151B]">{c.title} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${c.published ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-700"}`}>{c.published ? "Published" : "Draft"}</span></p><p className="mt-1 text-xs text-stone-600">{c.lessonCount} lessons · {c.learners} learners · {c.certificates} certificates</p></div>
                <button className={ghost} onClick={() => open(c.id)}><Pencil className="size-3.5" /> Edit</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "courses" && course && (
        <div className="space-y-6">
          <button className={ghost} onClick={() => { setCourse(null); setLesson(null); }}>All courses</button>
          <form className={`${card} space-y-3`} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void patchCourse({ title: f.get("title"), subtitle: f.get("subtitle"), description: f.get("description"), category: f.get("category"), level: f.get("level"), accent: f.get("accent"), passMark: Number(f.get("passMark")), certificateEnabled: f.get("cert") === "on" }); }}>
            <h2 className="font-display text-xl font-semibold">Course details</h2>
            <label className="block text-sm font-medium text-stone-700">Title<input name="title" required defaultValue={course.title} className={input} /></label>
            <label className="block text-sm font-medium text-stone-700">One-line summary<input name="subtitle" defaultValue={course.subtitle} maxLength={200} className={input} /></label>
            <label className="block text-sm font-medium text-stone-700">About this course (you can use Markdown)<textarea name="description" rows={5} defaultValue={course.description} className={area} /></label>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-sm font-medium text-stone-700">Level<select name="level" defaultValue={course.level} className={input}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
              <label className="text-sm font-medium text-stone-700">Topic<input name="category" defaultValue={course.category} className={input} placeholder="Pricing" /></label>
              <label className="text-sm font-medium text-stone-700">Pass mark (%)<input name="passMark" type="number" min={1} max={100} defaultValue={course.passMark} className={input} /></label>
              <label className="text-sm font-medium text-stone-700">Cover colour<input name="accent" type="color" defaultValue={course.accent} className={`${input} p-1`} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input name="cert" type="checkbox" defaultChecked={course.certificateEnabled} className="size-4 accent-[#650019]" /> Give learners a certificate when they finish</label>
            <FilePicker label="Cover picture (optional)" kind="image" accept="image/jpeg,image/png,image/webp" current={course.coverMediaId} onDone={(id) => void patchCourse({ coverMediaId: id }, "Cover saved.")} />
            <div className="flex flex-wrap gap-3 pt-2">
              <button disabled={busy} className={primary}>Save details</button>
              <button type="button" disabled={busy} onClick={() => void patchCourse({ published: !course.published }, course.published ? "Moved back to draft." : "Published. Learners can see it now.")} className={ghost}>{course.published ? "Unpublish" : "Publish course"}</button>
              <button type="button" onClick={() => { if (window.confirm("Delete this course, its lessons and all learner progress?")) void run(async () => { await api(`/api/admin/academy/courses/${course.id}`, { method: "DELETE" }); setCourse(null); await loadCourses(); }, "Course deleted."); }} className={`${ghost} ml-auto text-red-700`}><Trash2 className="size-3.5" /> Delete</button>
            </div>
          </form>

          <section className={card}>
            <div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Lessons</h2><button className={ghost} onClick={() => setLesson(blankLesson())}><Plus className="size-3.5" /> Add lesson</button></div>
            <ol className="mt-4 divide-y divide-[#F0E2E6]">
              {course.lessons.length === 0 && <li className="py-4 text-sm text-stone-600">No lessons yet.</li>}
              {course.lessons.map((l, i) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{l.title}</p><p className="text-xs text-stone-600">{l.section} · {l.kind}{l.kind === "video" && !l.mediaId ? " · no video yet" : ""}{l.isPreview ? " · free preview" : ""}</p></div>
                  <button className={ghost} aria-label="Move up" disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></button>
                  <button className={ghost} aria-label="Move down" disabled={i === course.lessons.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></button>
                  <button className={ghost} onClick={() => editLesson(l)}>Edit</button>
                  <button className={`${ghost} text-red-700`} aria-label="Delete lesson" onClick={() => { if (window.confirm(`Delete "${l.title}"?`)) void run(async () => { await api(`/api/admin/academy/lessons/${l.id}`, { method: "DELETE" }); await open(course.id); await loadCourses(); }, "Lesson deleted."); }}><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ol>
          </section>

          {lesson && (
            <form className={`${card} space-y-3`} onSubmit={(e) => { e.preventDefault(); saveLesson(); }}>
              <h2 className="font-display text-xl font-semibold">{lesson.id ? "Edit lesson" : "New lesson"}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-medium text-stone-700">Type<select value={lesson.kind} onChange={(e) => setLesson({ ...lesson, kind: e.target.value as Lesson["kind"] })} className={input}><option value="video">Video</option><option value="reading">Reading</option><option value="quiz">Quiz</option></select></label>
                <label className="text-sm font-medium text-stone-700 sm:col-span-2">Lesson title<input required value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} className={input} /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-700">Section (groups lessons)<input value={lesson.section} onChange={(e) => setLesson({ ...lesson, section: e.target.value })} className={input} /></label>
                <label className="text-sm font-medium text-stone-700">Short description<input value={lesson.summary} maxLength={300} onChange={(e) => setLesson({ ...lesson, summary: e.target.value })} className={input} /></label>
              </div>
              {lesson.kind === "video" && (<>
                <FilePicker label="Video file (MP4 or WebM, up to 2 GB)" kind="video" accept="video/mp4,video/webm" current={lesson.mediaId} onDone={(id) => setLesson((f) => f && { ...f, mediaId: id })} onDuration={(s) => setLesson((f) => f && { ...f, durationSeconds: s })} />
                <FilePicker label="Captions (optional, a .vtt file)" kind="captions" accept=".vtt,text/vtt" current={lesson.captionsMediaId} onDone={(id) => setLesson((f) => f && { ...f, captionsMediaId: id })} />
              </>)}
              {lesson.kind !== "quiz" && <label className="block text-sm font-medium text-stone-700">{lesson.kind === "video" ? "Notes or transcript (Markdown)" : "Lesson text (Markdown)"}<textarea rows={8} value={lesson.body} onChange={(e) => setLesson({ ...lesson, body: e.target.value })} className={area} /></label>}
              {lesson.kind === "quiz" && (
                <div className="space-y-4">
                  {lesson.quiz.map((q, i) => (
                    <fieldset key={i} className="rounded-xl border border-[#E6D4D8] p-4">
                      <legend className="px-1 text-sm font-semibold">Question {i + 1}</legend>
                      <input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} className={input} placeholder="Question" aria-label={`Question ${i + 1}`} />
                      {q.options.map((o, k) => (
                        <div key={k} className="mt-2 flex items-center gap-2">
                          <input type="radio" name={`c${i}`} checked={q.correct === k} onChange={() => setQ(i, { correct: k })} aria-label={`Option ${k + 1} is correct`} className="size-4 accent-[#650019]" />
                          <input value={o} onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })} className={`${input} mt-0`} placeholder={`Answer ${k + 1}`} aria-label={`Answer ${k + 1}`} />
                        </div>
                      ))}
                      <div className="mt-2 flex gap-2">{q.options.length < 6 && <button type="button" className={ghost} onClick={() => setQ(i, { options: [...q.options, ""] })}>Add answer</button>}<button type="button" className={`${ghost} text-red-700`} onClick={() => setLesson({ ...lesson, quiz: lesson.quiz.filter((_, k) => k !== i) })}>Remove question</button></div>
                      <input value={q.explain ?? ""} onChange={(e) => setQ(i, { explain: e.target.value })} className={input} placeholder="Why this is the right answer (shown after marking)" aria-label="Explanation" />
                    </fieldset>
                  ))}
                  <button type="button" className={ghost} onClick={() => setLesson({ ...lesson, quiz: [...lesson.quiz, blankQuestion()] })}><Plus className="size-3.5" /> Add question</button>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lesson.isPreview} onChange={(e) => setLesson({ ...lesson, isPreview: e.target.checked })} className="size-4 accent-[#650019]" /> Free preview (anyone can open it without signing in)</label>
              <div className="flex gap-3 pt-2"><button disabled={busy} className={primary}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Save lesson</button><button type="button" className={ghost} onClick={() => setLesson(null)}>Cancel</button></div>
            </form>
          )}
        </div>
      )}

      {tab === "live" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">Create the session on <a className="font-semibold text-[#650019] underline" href="/admin/trainings">Public trainings</a>, then choose here how it is delivered. A session delivered <strong>on Sewsiness</strong> plays its video for everyone at the scheduled time, with live chat and a questions list. Open the class room at start time to answer as host.</p>
          {live.length === 0 && <p className={`${card} text-sm text-stone-600`}>No sessions yet.</p>}
          {live.map((s) => (
            <section key={s.id} className={card}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1"><p className="font-semibold">{s.title}</p><p className="text-xs text-stone-600">{s.startsAt ? new Date(s.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No date"} · {s.status}{s.openQuestions > 0 ? ` · ${s.openQuestions} open question${s.openQuestions === 1 ? "" : "s"}` : ""}</p></div>
                <label className="text-sm font-medium text-stone-700">Delivery
                  <select value={s.delivery} onChange={(e) => void run(async () => { await api(`/api/admin/academy/live/${s.id}`, { method: "PATCH", body: JSON.stringify({ delivery: e.target.value }) }); await loadLive(); }, "Delivery saved.")} className={`${input} mt-1 w-56`}><option value="onsite">On Sewsiness</option><option value="external">Outside link (old way)</option></select>
                </label>
                {s.delivery === "onsite" && <a href={`/academy/live/${s.id}`} target="_blank" rel="noreferrer" className={ghost}>Open class room <ExternalLink className="size-3.5" /></a>}
              </div>
              {s.delivery === "onsite" && (<>
                <FilePicker label="Session video (MP4 or WebM). It also becomes the replay." kind="video" accept="video/mp4,video/webm" current={s.mediaId} onDone={(id) => void run(async () => { await api(`/api/admin/academy/live/${s.id}`, { method: "PATCH", body: JSON.stringify({ mediaId: id }) }); await loadLive(); }, "Video attached.")} />
                <FilePicker label="Captions (optional, a .vtt file)" kind="captions" accept=".vtt,text/vtt" current={s.captionsMediaId} onDone={(id) => void run(async () => { await api(`/api/admin/academy/live/${s.id}`, { method: "PATCH", body: JSON.stringify({ captionsMediaId: id }) }); await loadLive(); }, "Captions attached.")} />
              </>)}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
