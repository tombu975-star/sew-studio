"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Award, BookOpen, CheckCircle2, Circle, ClipboardCheck, Lock, PlayCircle } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { QuizRunner } from "./QuizRunner";
import type { LessonRow, ProgressMap } from "@/lib/academy/data";

type Current = LessonRow & { body: string; quiz: { q: string; options: string[] }[] | null };
type Props = {
  course: { slug: string; title: string; lessons: LessonRow[]; certificateEnabled: boolean };
  current: Current; progress: ProgressMap; signedIn: boolean; existingCertificate: string | null;
};

const ICON = { video: PlayCircle, reading: BookOpen, quiz: ClipboardCheck } as const;
const mins = (s: number) => (s > 0 ? `${Math.max(1, Math.round(s / 60))} min` : "");
const md = "text-[.97rem] leading-8 text-[#4b3a3f] [&_a]:font-semibold [&_a]:text-[#800020] [&_a]:underline [&_h2]:mt-8 [&_h2]:font-[family-name:var(--font-serif)] [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:text-[#35121d] [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-4 [&_strong]:text-[#35121d] [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-[#f2c14e] [&_blockquote]:pl-4";

export function LessonView({ course, current, progress, signedIn, existingCertificate }: Props) {
  const [done, setDone] = useState<Set<string>>(() => new Set(Object.entries(progress).filter(([, p]) => p.completed).map(([id]) => id)));
  const [certificate, setCertificate] = useState<string | null>(existingCertificate);
  const [saveError, setSaveError] = useState(false);
  const lastSave = useRef(0);
  const completing = useRef(false);

  const idx = course.lessons.findIndex((l) => l.id === current.id);
  const next = course.lessons[idx + 1];
  const isDone = done.has(current.id);

  const send = useCallback(async (position: number, completed: boolean) => {
    if (!signedIn) return;
    try {
      const res = await fetch(`/api/academy/lessons/${current.id}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ position: Math.floor(position), completed }), keepalive: true });
      if (!res.ok) throw new Error();
      setSaveError(false);
      const data = await res.json();
      if (completed) setDone((d) => new Set(d).add(current.id));
      if (data.certificate) setCertificate(data.certificate);
    } catch { setSaveError(true); completing.current = false; }
  }, [current.id, signedIn]);

  const onTick = useCallback((t: number, d: number) => {
    const now = Date.now();
    if (now - lastSave.current > 10000) { lastSave.current = now; void send(t, false); }
    if (d > 0 && t / d >= 0.9 && !completing.current && !done.has(current.id)) { completing.current = true; void send(t, true); }
  }, [send, done, current.id]);

  const sections = course.lessons.reduce<Record<string, LessonRow[]>>((acc, l) => { (acc[l.section] ||= []).push(l); return acc; }, {});
  const total = course.lessons.length, count = course.lessons.filter((l) => done.has(l.id)).length;
  const href = (id: string) => `/academy/learn/${course.slug}?lesson=${id}`;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:py-12">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[#6F565D]"><Link href="/academy" className="font-semibold hover:text-[#800020]">Academy</Link> / <Link href={`/academy/${course.slug}`} className="font-semibold hover:text-[#800020]">{course.title}</Link></nav>
        <h1 className="font-[family-name:var(--font-serif)] text-4xl font-semibold leading-tight text-[#35121d] sm:text-5xl">{current.title}</h1>
        {current.summary && <p className="mt-3 max-w-2xl text-base leading-7 text-[#6F565D]">{current.summary}</p>}

        {!signedIn && <p className="mt-6 rounded-2xl bg-[#fff4e5] px-5 py-4 text-sm leading-6 text-[#7a4a00]">You are watching a free preview. <Link href={`/academy/sign-in?next=${encodeURIComponent(href(current.id))}`} className="font-bold underline">Sign in</Link> to save your progress and earn your certificate.</p>}
        {saveError && <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-800">We could not save your progress just now. Check your connection. Your video keeps playing.</p>}

        <div className="mt-6">
          {current.kind === "video" && (current.mediaId
            ? <VideoPlayer key={current.id} src={`/api/academy/media/${current.mediaId}`} captionsSrc={current.captionsMediaId ? `/api/academy/media/${current.captionsMediaId}` : null} title={current.title}
                startAt={progress[current.id]?.position ?? 0} onTick={onTick} onPause={(t) => void send(t, false)} onEnded={() => { if (!done.has(current.id)) void send(0, true); }} />
            : <p className="rounded-2xl border border-dashed border-[#d9bdc4] p-10 text-center text-sm text-[#6F565D]">The video for this lesson has not been added yet.</p>)}
          {current.kind === "reading" && current.body && <article className={`rounded-2xl border border-[#e6d6d8] bg-white p-6 sm:p-9 ${md}`}><ReactMarkdown>{current.body}</ReactMarkdown></article>}
          {current.kind === "quiz" && current.quiz && (signedIn
            ? <QuizRunner key={current.id} lessonId={current.id} questions={current.quiz} onResult={(o) => { if (o.passed) setDone((d) => new Set(d).add(current.id)); if (o.certificate) setCertificate(o.certificate); }} />
            : <p className="rounded-2xl border border-[#e6d6d8] bg-white p-8 text-center text-sm text-[#6F565D]">Sign in to take this quiz.</p>)}
        </div>

        {current.kind === "video" && current.body && (
          <details className="mt-6 rounded-2xl border border-[#e6d6d8] bg-white p-5 sm:p-6">
            <summary className="cursor-pointer text-sm font-bold text-[#800020]">Notes and transcript</summary>
            <div className={`mt-2 ${md}`}><ReactMarkdown>{current.body}</ReactMarkdown></div>
          </details>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {current.kind === "reading" && signedIn && !isDone && <button onClick={() => void send(0, true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#800020] px-7 text-sm font-bold text-white hover:bg-[#650019]"><CheckCircle2 className="size-4" /> Mark as read</button>}
          {isDone && <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="size-5" /> Lesson complete</span>}
          {next && (isDone || !signedIn) && <Link href={href(next.id)} className="inline-flex h-12 items-center gap-2 rounded-full border border-[#d9bdc4] px-7 text-sm font-bold text-[#800020] hover:bg-[#fbf3f5]">Next: {next.title} <ArrowRight className="size-4" /></Link>}
        </div>

        {certificate && (
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[1.6rem] bg-[#3b0a18] p-6 text-white sm:p-8">
            <Award className="size-10 text-[#f2c14e]" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="font-[family-name:var(--font-serif)] text-3xl font-semibold">You completed {course.title}</p><p className="mt-1 text-sm text-white/75">Your certificate number is {certificate}. Anyone can check it on this site.</p></div>
            <a href={`/api/academy/certificates/${certificate}/pdf`} target="_blank" rel="noopener" className="inline-flex h-12 items-center rounded-full bg-[#f2c14e] px-6 text-sm font-bold text-[#3b0a18]">Download certificate</a>
          </div>
        )}
      </div>

      <aside aria-label="Course lessons" className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-[#e6d6d8] bg-white p-5">
          <p className="text-sm font-bold text-[#35121d]">{count} of {total} lessons done</p>
          <div className="mt-2 h-2 rounded-full bg-[#f0e2e6]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count} aria-label="Course progress"><div className="h-2 rounded-full bg-[#800020] transition-all" style={{ width: total ? `${(count / total) * 100}%` : 0 }} /></div>
          <div className="mt-5 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {Object.entries(sections).map(([name, list]) => (
              <div key={name}>
                {Object.keys(sections).length > 1 && <p className="mb-2 text-sm font-bold text-[#6F565D]">{name}</p>}
                <ul className="space-y-1">
                  {list.map((l) => {
                    const Icon = ICON[l.kind], locked = !signedIn && !l.isPreview, active = l.id === current.id;
                    return (
                      <li key={l.id}>
                        <Link href={locked ? `/academy/sign-in?next=${encodeURIComponent(href(l.id))}` : href(l.id)} aria-current={active ? "page" : undefined}
                          className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[#fbf1f3] font-bold text-[#800020]" : "text-[#5b303c] hover:bg-[#fbf7f7]"}`}>
                          {locked ? <Lock className="mt-0.5 size-4 shrink-0 text-[#b08b94]" /> : done.has(l.id) ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-[#c9aab2]" />}
                          <span className="min-w-0 flex-1">{l.title}<span className="mt-0.5 flex items-center gap-1.5 text-xs font-normal text-[#6F565D]"><Icon className="size-3" /> {l.kind === "video" ? mins(l.durationSeconds) || "Video" : l.kind === "quiz" ? "Quiz" : "Reading"}{l.isPreview && !signedIn ? " · Free preview" : ""}</span></span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
