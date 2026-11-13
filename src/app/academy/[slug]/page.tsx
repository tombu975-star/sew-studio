import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Award, BookOpen, ClipboardCheck, Clock3, PlayCircle } from "lucide-react";
import { SiteShell, heading } from "@/components/site/SiteShell";
import { CourseCover } from "@/components/academy/CourseCover";
import { getLearner } from "@/lib/academy/auth";
import { getCourse, getProgress } from "@/lib/academy/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCourse((await params).slug);
  return c ? { title: c.title, description: c.subtitle || undefined } : { title: "Course not found" };
}

const ICON = { video: PlayCircle, reading: BookOpen, quiz: ClipboardCheck } as const;

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCourse((await params).slug);
  if (!course) notFound();
  const learner = await getLearner();
  const progress = learner ? await getProgress(learner.id, course.id) : {};
  const done = course.lessons.filter((l) => progress[l.id]?.completed).length;
  const resume = course.lessons.find((l) => !progress[l.id]?.completed) ?? course.lessons[0];
  const sections = course.lessons.reduce<Record<string, typeof course.lessons>>((a, l) => { (a[l.section] ||= []).push(l); return a; }, {});
  const cta = done === 0 ? "Start the course" : done === course.lessons.length ? "Review the course" : "Continue learning";
  return (
    <SiteShell>
      <section className="px-5 py-12 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold text-[#800020]">{course.level}{course.category ? ` · ${course.category}` : ""}</p>
            <h1 className={`${heading} mt-3 text-5xl font-semibold leading-[1.02] text-[#35121d] sm:text-6xl`}>{course.title}</h1>
            {course.subtitle && <p className="mt-5 max-w-xl text-lg leading-8 text-[#6F565D]">{course.subtitle}</p>}
            <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#5b303c]">
              <span className="flex items-center gap-2"><PlayCircle className="size-4 text-[#800020]" />{course.lessonCount} lessons</span>
              {course.minutes > 0 && <span className="flex items-center gap-2"><Clock3 className="size-4 text-[#800020]" />About {course.minutes} minutes</span>}
              {course.certificateEnabled && <span className="flex items-center gap-2"><Award className="size-4 text-[#800020]" />Free certificate</span>}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {resume && <Link href={`/academy/learn/${course.slug}?lesson=${resume.id}`} className="inline-flex h-14 items-center gap-3 rounded-full bg-[#800020] px-8 text-sm font-bold text-white shadow-lg shadow-[#800020]/20 transition hover:-translate-y-0.5 hover:bg-[#650019]">{cta} <ArrowRight className="size-4" /></Link>}
              {learner && done > 0 && <span className="text-sm font-semibold text-[#5b303c]">{done} of {course.lessons.length} lessons done</span>}
            </div>
            {!learner && <p className="mt-4 text-xs text-[#6F565D]">Free. You sign in with your email, and there is no password.</p>}
          </div>
          <CourseCover course={course} className="aspect-[5/4] w-full rounded-[1.8rem]" />
        </div>
      </section>
      <section className="bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className={`${heading} text-4xl font-semibold text-[#35121d]`}>About this course</h2>
            <div className="mt-5 text-[.97rem] leading-8 text-[#5f4b50] [&_p]:mt-4"><ReactMarkdown>{course.description || course.subtitle}</ReactMarkdown></div>
          </div>
          <div>
            <h2 className={`${heading} text-4xl font-semibold text-[#35121d]`}>What you will do</h2>
            <div className="mt-6 space-y-7">
              {Object.entries(sections).map(([name, list]) => (
                <div key={name}>
                  {Object.keys(sections).length > 1 && <h3 className="mb-2 text-base font-bold text-[#6F565D]">{name}</h3>}
                  <ul className="divide-y divide-[#f0e6e8] rounded-2xl border border-[#eadde0]">
                    {list.map((l) => { const Icon = ICON[l.kind]; return (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-3.5 text-sm">
                        <Icon className="size-4 shrink-0 text-[#800020]" aria-hidden="true" />
                        <span className="min-w-0 flex-1 font-semibold text-[#3c1721]">{l.title}</span>
                        {l.isPreview && <Link href={`/academy/learn/${course.slug}?lesson=${l.id}`} className="shrink-0 rounded-full bg-[#fff0c9] px-3 py-1 text-xs font-bold text-[#7a4a00]">Free preview</Link>}
                        {l.durationSeconds > 0 && <span className="shrink-0 text-xs text-[#6F565D]">{Math.max(1, Math.round(l.durationSeconds / 60))} min</span>}
                      </li>
                    ); })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
