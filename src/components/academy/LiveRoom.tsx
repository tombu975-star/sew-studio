"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarPlus, CheckCircle2, EyeOff, HelpCircle, Loader2, MessageSquare, Pin, Radio, Send } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import { SignInPanel } from "./SignInPanel";

type Session = { id: string; title: string; description: string; presenter: string; startsAt: string | null; durationMinutes: number; status: string; delivery: "external" | "onsite"; mediaId: string | null; captionsMediaId: string | null };
type Msg = { id: number; name: string; body: string; kind: "chat" | "question" | "host"; answered: boolean; pinned: boolean; hidden: boolean; mine: boolean };
type State = { session: Session; serverNow: number; isHost: boolean; learner: { id: string; name: string } | null; messages: Msg[] };

const phaseOf = (s: Session, now: number): "upcoming" | "live" | "replay" => {
  const start = s.startsAt ? Date.parse(s.startsAt) : null;
  if (s.status === "Completed") return "replay";
  if (s.status === "Live") return "live";
  if (start === null) return "upcoming";
  if (now >= start + s.durationMinutes * 60000) return "replay";
  return now >= start ? "live" : "upcoming";
};
const pad = (n: number) => String(n).padStart(2, "0");
const ics = (s: Session) => {
  const f = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const st = Date.parse(s.startsAt!);
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sewsiness//Academy//EN", "BEGIN:VEVENT", `UID:${s.id}@sewsiness`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(st)}`, `DTEND:${f(st + s.durationMinutes * 60000)}`, `SUMMARY:${s.title.replace(/[,;\n]/g, " ")}`, `URL:${typeof window !== "undefined" ? window.location.href : ""}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n"));
};

export function LiveRoom({ id }: { id: string }) {
  const [state, setState] = useState<State | null>(null);
  const [missing, setMissing] = useState(false);
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [text, setText] = useState("");
  const [asQuestion, setAsQuestion] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [tab, setTab] = useState<"chat" | "questions">("chat");
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/academy/live/${id}`, { cache: "no-store" });
      if (res.status === 404) { setMissing(true); return; }
      const data: State = await res.json();
      setSkew(data.serverNow - Date.now());
      setState(data);
    } catch { /* keep the last state while offline */ }
  }, [id]);

  useEffect(() => {
    void load();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => { void load(); timer = setTimeout(tick, document.hidden ? 12000 : 3500); };
    timer = setTimeout(tick, 3500);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const el = listRef.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [state?.messages.length, tab]);

  if (missing) return <p className="mx-auto max-w-xl px-5 py-24 text-center text-[#6F565D]">This session could not be found. It may have been cancelled.</p>;
  if (!state) return <div className="grid place-items-center py-32"><Loader2 className="size-8 animate-spin text-[#800020]" /></div>;

  const { session: s, isHost, learner, messages } = state;
  const serverNow = now + skew;
  const phase = phaseOf(s, serverNow);
  const start = s.startsAt ? Date.parse(s.startsAt) : 0;
  const liveEdge = () => Math.max(0, (Date.now() + skew - start) / 1000);
  const signedIn = !!learner || isHost;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true); setChatError("");
    try {
      const res = await fetch(`/api/academy/live/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text, kind: asQuestion ? "question" : "chat" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send.");
      setText(""); stick.current = true; await load();
    } catch (err) { setChatError(err instanceof Error ? err.message : "Could not send."); }
    finally { setSending(false); }
  }
  async function moderate(mid: number, patch: Partial<Pick<Msg, "pinned" | "answered" | "hidden">>) {
    await fetch(`/api/academy/live/${id}/messages/${mid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    await load();
  }

  const secs = Math.max(0, Math.floor((start - serverNow) / 1000));
  const parts: [number, string][] = [[Math.floor(secs / 86400), "days"], [Math.floor((secs % 86400) / 3600), "hours"], [Math.floor((secs % 3600) / 60), "minutes"], [secs % 60, "seconds"]];
  const pinned = messages.filter((m) => m.pinned && !m.hidden);
  const shown = (tab === "questions" ? messages.filter((m) => m.kind === "question") : messages).filter((m) => isHost || !m.hidden);
  const when = s.startsAt ? new Date(s.startsAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" }) : "Date to be announced";

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${phase === "live" ? "bg-red-600 text-white" : "bg-[#f7edf0] text-[#800020]"}`}>
          {phase === "live" && <span className="size-2 animate-pulse rounded-full bg-white" />}{phase === "live" ? "Live now" : phase === "replay" ? "Replay" : "Starting soon"}
        </span>
        {isHost && <span className="rounded-full bg-[#3b0a18] px-3 py-1.5 text-xs font-bold text-[#f2c14e]">You are the host</span>}
      </div>
      <h1 className="mt-3 font-[family-name:var(--font-serif)] text-4xl font-semibold leading-tight text-[#35121d] sm:text-5xl">{s.title}</h1>
      <p className="mt-2 text-sm text-[#6F565D]">{when} · {s.durationMinutes} minutes{s.presenter ? ` · with ${s.presenter}` : ""}</p>

      {!signedIn ? (
        <div className="mx-auto mt-10 max-w-md"><SignInPanel next={`/academy/live/${id}`} onSignedIn={load} intro="Sign in with your email to join this session. We will send you a 6-digit code." /></div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            {s.delivery !== "onsite" ? (
              <p className="rounded-2xl border border-[#e6d6d8] bg-white p-10 text-center text-sm leading-7 text-[#5f4b50]">This session is run outside the platform. The joining link was emailed to you when you signed up.</p>
            ) : phase === "upcoming" ? (
              <div className="rounded-2xl bg-[#3b0a18] p-8 text-center text-white sm:p-12">
                <p className="text-sm text-white/70">This class opens in</p>
                <div className="mt-5 flex justify-center gap-3 sm:gap-5" role="timer" aria-live="off">
                  {parts.map(([n, label]) => <div key={label} className="min-w-16 rounded-xl bg-white/10 px-3 py-4"><p className="font-[family-name:var(--font-serif)] text-4xl font-semibold tabular-nums sm:text-5xl">{pad(n)}</p><p className="mt-1 text-xs text-white/70">{label}</p></div>)}
                </div>
                {s.startsAt && <a href={ics(s)} download="sewsiness-class.ics" className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-[#f2c14e] px-6 text-sm font-bold text-[#3b0a18]"><CalendarPlus className="size-4" /> Add to my calendar</a>}
                <p className="mx-auto mt-5 max-w-md text-xs leading-6 text-white/65">Keep this page open. The class starts by itself at the time above, and the chat is already open for early questions.</p>
              </div>
            ) : s.mediaId ? (
              <VideoPlayer key={`${s.mediaId}-${phase}`} src={`/api/academy/media/${s.mediaId}`} captionsSrc={s.captionsMediaId ? `/api/academy/media/${s.captionsMediaId}` : null} title={s.title}
                startAt={phase === "live" ? liveEdge() : 0} maxTime={phase === "live" ? liveEdge : undefined} />
            ) : (
              <p className="rounded-2xl border border-dashed border-[#d9bdc4] p-10 text-center text-sm text-[#6F565D]">The host has not added the session video yet. Stay on this page and use the chat.</p>
            )}
            {phase === "live" && s.mediaId && <p className="mt-3 text-xs text-[#6F565D]"><Radio className="mr-1 inline size-3.5 text-red-600" />Everyone watches together. You can go back, but you cannot skip ahead of the class.</p>}
            {s.description && <p className="mt-6 max-w-2xl whitespace-pre-line text-sm leading-7 text-[#5f4b50]">{s.description}</p>}
          </div>

          <section aria-label="Class chat" className="flex h-[32rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-[#e6d6d8] bg-white lg:h-[36rem]">
            <div role="tablist" className="grid grid-cols-2 border-b border-[#eadde0] text-sm font-bold">
              {(["chat", "questions"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex h-12 items-center justify-center gap-2 ${tab === t ? "bg-[#fbf1f3] text-[#800020]" : "text-[#6F565D] hover:bg-[#fbf7f7]"}`}>{t === "chat" ? <MessageSquare className="size-4" /> : <HelpCircle className="size-4" />}{t === "chat" ? "Chat" : "Questions"}</button>)}
            </div>
            {pinned.length > 0 && tab === "chat" && <div className="border-b border-[#f0e2e6] bg-[#fff8e6] px-4 py-2.5 text-xs leading-5 text-[#6b4a00]"><Pin className="mr-1 inline size-3" />{pinned[pinned.length - 1].body}</div>}
            <div ref={listRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {shown.length === 0 && <p className="py-10 text-center text-sm text-[#6F565D]">{tab === "chat" ? "Say hello. Be kind and keep it about sewing and business." : "No questions yet. Ask the host anything."}</p>}
              {shown.map((m) => (
                <div key={m.id} className={`text-sm leading-6 ${m.hidden ? "opacity-40" : ""}`}>
                  <p><span className={`font-bold ${m.kind === "host" ? "text-[#800020]" : "text-[#35121d]"}`}>{m.name}{m.kind === "host" && m.name.toLowerCase() !== "host" ? " (host)" : ""}</span>{m.kind === "question" && <span className="ml-2 rounded-full bg-[#fff0c9] px-2 py-0.5 text-[11px] font-bold text-[#7a4a00]">{m.answered ? "Answered" : "Question"}</span>}</p>
                  <p className="break-words text-[#4b3a3f]">{m.body}</p>
                  {isHost && (
                    <p className="mt-1 flex gap-3 text-xs font-bold text-[#800020]">
                      <button onClick={() => moderate(m.id, { pinned: !m.pinned })}>{m.pinned ? "Unpin" : "Pin"}</button>
                      {m.kind === "question" && <button onClick={() => moderate(m.id, { answered: !m.answered })}><CheckCircle2 className="mr-1 inline size-3" />{m.answered ? "Reopen" : "Mark answered"}</button>}
                      <button onClick={() => moderate(m.id, { hidden: !m.hidden })}><EyeOff className="mr-1 inline size-3" />{m.hidden ? "Show" : "Hide"}</button>
                    </p>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={send} className="border-t border-[#eadde0] p-3">
              {!isHost && <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#5b303c]"><input type="checkbox" checked={asQuestion} onChange={(e) => setAsQuestion(e.target.checked)} className="size-4 accent-[#800020]" /> This is a question for the host</label>}
              {chatError && <p role="alert" className="mb-2 text-xs text-red-700">{chatError}</p>}
              <div className="flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label="Your message" placeholder={asQuestion ? "Type your question" : "Type a message"} className="h-11 min-w-0 flex-1 rounded-full border border-[#d9bdc4] px-4 text-sm outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10" />
                <button disabled={sending || !text.trim()} aria-label="Send message" className="grid size-11 place-items-center rounded-full bg-[#800020] text-white disabled:bg-[#c9aab2]">{sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
