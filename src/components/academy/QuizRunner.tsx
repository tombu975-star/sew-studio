"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type Q = { q: string; options: string[] };
type Outcome = { score: number; total: number; passed: boolean; passMark: number; results: { correct: boolean; answer: number; explain: string | null }[]; courseCompleted?: boolean; certificate?: string | null };

export function QuizRunner({ lessonId, questions, onResult }: { lessonId: string; questions: Q[]; onResult: (o: Outcome) => void }) {
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = questions.every((_, i) => answers[i] !== undefined);

  async function submit() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/academy/lessons/${lessonId}/quiz`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not mark your answers.");
      setOutcome(data); onResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not mark your answers."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <fieldset key={qi} className="rounded-2xl border border-[#e6d6d8] bg-white p-5 sm:p-6">
          <legend className="px-1 font-[family-name:var(--font-serif)] text-xl font-semibold text-[#35121d]">{qi + 1}. {q.q}</legend>
          <div className="mt-3 space-y-2">
            {q.options.map((opt, oi) => {
              const r = outcome?.results[qi];
              const picked = answers[qi] === oi;
              const right = r && oi === r.answer, wrong = r && picked && !r.correct;
              return (
                <label key={oi} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${right ? "border-emerald-500 bg-emerald-50" : wrong ? "border-red-400 bg-red-50" : picked ? "border-[#800020] bg-[#fbf3f5]" : "border-[#eadde0] hover:bg-[#fbf7f7]"}`}>
                  <input type="radio" name={`q${qi}`} disabled={!!outcome} checked={picked} onChange={() => setAnswers((a) => { const n = [...a]; n[qi] = oi; return n; })} className="size-4 accent-[#800020]" />
                  <span className="flex-1 text-[#3c1721]">{opt}</span>
                  {right && <Check className="size-4 text-emerald-700" aria-label="Correct answer" />}
                  {wrong && <X className="size-4 text-red-600" aria-label="Your answer was wrong" />}
                </label>
              );
            })}
          </div>
          {outcome?.results[qi]?.explain && <p className="mt-3 rounded-lg bg-[#f5ece8] px-4 py-3 text-sm leading-6 text-[#5f4b50]">{outcome.results[qi].explain}</p>}
        </fieldset>
      ))}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {!outcome ? (
        <button onClick={submit} disabled={!ready || busy} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#800020] px-7 text-sm font-bold text-white transition hover:bg-[#650019] disabled:cursor-not-allowed disabled:bg-[#c9aab2]">
          {busy && <Loader2 className="size-4 animate-spin" />} Check my answers
        </button>
      ) : (
        <div role="status" className={`rounded-2xl p-5 text-sm ${outcome.passed ? "bg-emerald-50 text-emerald-900" : "bg-[#fff4e5] text-[#7a4a00]"}`}>
          <p className="text-lg font-semibold">{outcome.passed ? "Passed" : "Not yet"}: you got {outcome.score} of {outcome.total}.</p>
          <p className="mt-1">{outcome.passed ? "This lesson is now complete." : `You need ${outcome.passMark}% to pass. Read the notes above, then try again.`}</p>
          {!outcome.passed && <button onClick={() => { setOutcome(null); setAnswers([]); }} className="mt-3 inline-flex h-10 items-center rounded-full border border-[#c58f1b] px-5 font-bold">Try again</button>}
        </div>
      )}
    </div>
  );
}
