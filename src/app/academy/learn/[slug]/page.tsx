import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { LessonView } from "@/components/academy/LessonView";
import { SignInPanel } from "@/components/academy/SignInPanel";
import { getLearner } from "@/lib/academy/auth";
import { getCourse, getLesson, getProgress } from "@/lib/academy/data";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lesson", robots: { index: false } };

export default async function LearnPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { slug } = await params;
  const { lesson: lessonParam } = await searchParams;
  const course = await getCourse(slug);
  if (!course || course.lessons.length === 0) notFound();
  const learner = await getLearner();
  const progress = learner ? await getProgress(learner.id, course.id) : {};
  const wanted = course.lessons.find((l) => l.id === lessonParam);
  const target = wanted ?? course.lessons.find((l) => !progress[l.id]?.completed) ?? course.lessons[0];
  const next = `/academy/learn/${course.slug}?lesson=${target.id}`;

  if (!learner && !target.isPreview) {
    return (
      <SiteShell>
        <section className="px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-md"><SignInPanel next={next} intro={`Sign in to start ${course.title}. It is free, and you only need your email.`} /></div>
        </section>
      </SiteShell>
    );
  }
  const lesson = await getLesson(course.id, target.id);
  if (!lesson) notFound();
  const cert = learner ? (await getPool().query("select code from public.academy_certificates where learner_id = $1 and course_id = $2", [learner.id, course.id])).rows[0]?.code ?? null : null;
  return (
    <SiteShell>
      <LessonView course={course} current={{ ...lesson, position: 0 } as never} progress={progress} signedIn={!!learner} existingCertificate={cert} />
    </SiteShell>
  );
}
