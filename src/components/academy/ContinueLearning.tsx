"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Flame } from "lucide-react";

type Summary = { learner: { fullName: string } | null; streak?: number; resume?: { title: string; slug: string; lessonId: string; done: number; total: number } | null };

/** Shown only to returning learners: pick up exactly where they stopped. */
export function ContinueLearning({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [s, setS] = useState<Summary | null>(null);
  useEffect(() => { fetch("/api/academy/me?summary=1").then((r) => r.json()).then(setS).catch(() => undefined); }, []);
  if (!s?.learner || (!s.resume && !s.streak)) return null;
  const dark = tone === "dark";
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl px-5 py-4 ${dark ? "bg-white/10 text-white" : "border border-[#e6d6d8] bg-white text-[#35121d]"}`}>
      {!!s.streak && s.streak > 1 && <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${dark ? "bg-[#f2c14e] text-[#3b0a18]" : "bg-[#fff0c9] text-[#7a4a00]"}`}><Flame className="size-3.5" /> {s.streak}-day learning streak</span>}
      {s.resume && (
        <>
          <p className="min-w-0 flex-1 text-sm"><span className={dark ? "text-white/70" : "text-[#6F565D]"}>Pick up where you left off: </span><strong>{s.resume.title}</strong> <span className={dark ? "text-white/70" : "text-[#6F565D]"}>({s.resume.done} of {s.resume.total} lessons done)</span></p>
          <Link href={`/academy/learn/${s.resume.slug}?lesson=${s.resume.lessonId}`} className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold ${dark ? "bg-white text-[#650019]" : "bg-[#800020] text-white hover:bg-[#650019]"}`}>Continue <ArrowRight className="size-4" /></Link>
        </>
      )}
    </div>
  );
}
