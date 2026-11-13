import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Flame } from "lucide-react";
import { SiteShell, heading } from "@/components/site/SiteShell";
import { SignOutButton } from "@/components/academy/SignOutButton";
import { getLearner } from "@/lib/academy/auth";
import { getLearnerDashboard } from "@/lib/academy/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My learning", robots: { index: false } };

export default async function MyLearning() {
  const learner = await getLearner();
  if (!learner) redirect("/academy/sign-in?next=/academy/me");
  const d = await getLearnerDashboard(learner.id);
  return (
    <SiteShell>
      <section className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className={`${heading} text-5xl font-semibold text-[#35121d] sm:text-6xl`}>Hello, {learner.fullName.split(" ")[0]}</h1>
              <p className="mt-2 text-sm text-[#6F565D]">{learner.email} · <SignOutButton /></p>
            </div>
            {d.streak > 1 && <span className="inline-flex items-center gap-2 rounded-full bg-[#fff0c9] px-4 py-2 text-sm font-bold text-[#7a4a00]"><Flame className="size-4" /> {d.streak}-day streak</span>}
          </div>

          <h2 className={`${heading} mt-14 text-3xl font-semibold text-[#35121d]`}>My courses</h2>
          {d.courses.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-[#e6d6d8] bg-white p-8 text-sm text-[#6F565D]">You have not started a course yet. <Link href="/academy" className="font-bold text-[#800020] underline">Browse the courses</Link>.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {d.courses.map((c) => {
                const pct = c.lessonCount ? Math.round((c.done / c.lessonCount) * 100) : 0;
                const href = c.lastLessonId ? `/academy/learn/${c.slug}?lesson=${c.lastLessonId}` : `/academy/learn/${c.slug}`;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-5 rounded-2xl border border-[#e6d6d8] bg-white p-5 sm:p-6">
                    <div className="min-w-0 flex-1">
                      <p className={`${heading} text-2xl font-semibold text-[#35121d]`}>{c.title}</p>
                      <div className="mt-3 h-2 max-w-sm rounded-full bg-[#f0e2e6]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title} progress`}><div className="h-2 rounded-full bg-[#800020]" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-2 text-xs text-[#6F565D]">{c.done} of {c.lessonCount} lessons{c.completedAt ? " · Completed" : ""}</p>
                    </div>
                    <Link href={href} className="inline-flex h-11 items-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#650019]">{c.completedAt ? "Review" : "Continue"}</Link>
                  </li>
                );
              })}
            </ul>
          )}

          <h2 className={`${heading} mt-14 text-3xl font-semibold text-[#35121d]`}>My certificates</h2>
          {d.certificates.length === 0 ? <p className="mt-5 text-sm text-[#6F565D]">Finish every lesson in a course to earn your first certificate.</p> : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {d.certificates.map((c) => (
                <li key={c.code} className="rounded-2xl bg-[#3b0a18] p-6 text-white">
                  <Award className="size-7 text-[#f2c14e]" aria-hidden="true" />
                  <p className={`${heading} mt-3 text-2xl font-semibold`}>{c.courseTitle}</p>
                  <p className="mt-1 text-xs text-white/70">Number {c.code} · {new Date(c.issuedAt).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })}</p>
                  <a href={`/api/academy/certificates/${c.code}/pdf`} target="_blank" rel="noopener" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#f2c14e] px-5 text-sm font-bold text-[#3b0a18]">Download</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
