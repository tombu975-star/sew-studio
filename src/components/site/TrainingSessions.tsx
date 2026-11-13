"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Loader2, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PublicTraining } from "@/lib/public-trainings";

type Result = { title: string; startsAt: string | null; link: string | null; linkKind: "join" | "replay"; alreadyRegistered: boolean };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "full", timeStyle: "short" }) : "Date to be announced");
const field = "mt-1.5 h-12 w-full rounded-xl border border-[#d9bdc4] bg-white px-4 text-sm text-[#2F151B] outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10";
const isPast = (s: PublicTraining) => s.status === "Completed" || (s.status !== "Live" && s.startsAt !== null && Date.parse(s.startsAt) < Date.now() - s.durationMinutes * 60000);

/** Free sessions anyone can sign up for. No account needed. */
export function TrainingSessions({ sessions, emptyText }: { sessions: PublicTraining[]; emptyText?: string }) {
  const [active, setActive] = useState<PublicTraining | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const close = () => { setActive(null); setResult(null); setError(""); };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active) return;
    const data = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/public/trainings/${active.id}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: data.get("fullName"), email: data.get("email"), phone: data.get("phone"), aboutYou: data.get("aboutYou"), website: data.get("website") }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      setResult(json as Result);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  if (sessions.length === 0) return <p className="rounded-2xl border border-[#e6d6d8] bg-white p-8 text-center text-sm text-[#6F565D]">{emptyText ?? "New sessions will be announced soon."}</p>;

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s) => {
          const past = isPast(s);
          const full = s.spotsLeft === 0;
          return (
            <article key={s.id} className="flex flex-col rounded-[1.6rem] border border-[#e6d6d8] bg-white p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#f7edf0] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#800020]">{s.status === "Live" ? "Live now" : past ? "Past session" : s.kind}</span>
                <Video className="size-5 text-[#800020]" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-[family-name:var(--font-serif)] text-3xl font-semibold leading-tight text-[#35121d]">{s.title}</h3>
              {s.description && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#6F565D]">{s.description}</p>}
              <div className="mt-5 space-y-2 text-sm text-[#5f4b50]">
                <p className="flex items-center gap-2"><CalendarDays className="size-4 text-[#800020]" />{when(s.startsAt)}</p>
                <p className="flex items-center gap-2"><Clock3 className="size-4 text-[#800020]" />{s.durationMinutes} minutes{s.presenter ? ` · with ${s.presenter}` : ""}</p>
                {s.spotsLeft !== null && !past && <p className="text-xs font-semibold text-[#800020]">{full ? "Fully booked" : `${s.spotsLeft} place${s.spotsLeft === 1 ? "" : "s"} left`}</p>}
              </div>
              <div className="mt-auto pt-6">
                {past && !s.hasReplay ? <span className="text-sm font-semibold text-[#6F565D]">This session has finished</span> : (
                  <button type="button" disabled={full && !past} onClick={() => setActive(s)} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white transition hover:bg-[#650019] disabled:cursor-not-allowed disabled:bg-[#c9aab2]">
                    {past ? "Get the replay" : full ? "Fully booked" : "Reserve your free place"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-md">
          {result ? (
            <div className="py-2 text-center">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden="true" />
              <DialogHeader className="mt-4 items-center text-center">
                <DialogTitle className="font-[family-name:var(--font-serif)] text-3xl">{result.alreadyRegistered ? "You are already signed up" : "You are signed up"}</DialogTitle>
                <DialogDescription>{result.title}<br />{when(result.startsAt)}</DialogDescription>
              </DialogHeader>
              {result.link ? (
                <a href={result.link} {...(result.link.includes("/academy/") ? {} : { target: "_blank", rel: "noreferrer noopener" })} className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#650019]">
                  {result.linkKind === "replay" ? "Watch the replay" : "Open the class room"} <ExternalLink className="size-4" />
                </a>
              ) : <p className="mt-6 text-sm text-[#5f4b50]">We will email you the joining link before the session starts.</p>}
              <p className="mt-4 text-xs text-[#6F565D]">We have also emailed you these details. Check your spam folder if you do not see it.</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-[family-name:var(--font-serif)] text-3xl">Reserve your place</DialogTitle>
                <DialogDescription>{active?.title}. Free, and you do not need an account.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm font-semibold text-[#5b303c]">Your name<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" className={field} /></label>
                <label className="block text-sm font-semibold text-[#5b303c]">Email address<input name="email" type="email" required maxLength={254} autoComplete="email" className={field} /></label>
                <label className="block text-sm font-semibold text-[#5b303c]">WhatsApp or phone (optional)<input name="phone" type="tel" maxLength={30} autoComplete="tel" className={field} /></label>
                <label className="block text-sm font-semibold text-[#5b303c]">I am a… (optional)
                  <select name="aboutYou" className={field} defaultValue=""><option value="">Choose one</option><option>Fashion graduate</option><option>Student</option><option>Tailor or seamstress</option><option>Studio owner</option><option>Other</option></select>
                </label>
                <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                <button disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#800020] text-sm font-bold text-white hover:bg-[#650019] disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />}{busy ? "Signing you up…" : "Sign me up"}</button>
                <p className="text-center text-xs text-[#6F565D]">We only use your details to run this session and tell you about it. See our <a href="/privacy" className="font-semibold text-[#800020] underline">privacy policy</a>.</p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
