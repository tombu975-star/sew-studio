import type { Metadata } from "next";
import Link from "next/link";
import { Award, Clock3, PlayCircle, Users } from "lucide-react";
import { SiteShell, heading } from "@/components/site/SiteShell";
import { TrainingSessions } from "@/components/site/TrainingSessions";
import { CourseCover } from "@/components/academy/CourseCover";
import { ContinueLearning } from "@/components/academy/ContinueLearning";
import { listPublishedCourses } from "@/lib/academy/data";
import { isPastSession, loadPublicTrainings } from "@/lib/public-trainings";
import { CONTACT } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sewsiness Academy",
  description: "Free video courses, live classes and certificates for people who sew for a living. Learn pricing, record keeping and how to pay yourself.",
};

export default async function AcademyPage() {
  const [courses, trainings] = await Promise.all([listPublishedCourses(), loadPublicTrainings()]);
  const upcoming = trainings.filter((s) => !isPastSession(s));
  const replays = trainings.filter((s) => isPastSession(s) && s.hasReplay).reverse();
  return (
    <SiteShell>
      <section className="site-dark-panel relative overflow-hidden bg-[#2b0712] px-5 py-20 text-white sm:px-8 sm:py-28">
        <img src="/sewsiness-atelier-hero.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_30%] opacity-25" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#2b0712_8%,rgba(43,7,18,.7)_60%,rgba(43,7,18,.35))]" />
        <div className="relative mx-auto max-w-7xl">
          <h1 className={`${heading} max-w-3xl text-5xl font-semibold leading-[1.02] text-white sm:text-7xl`}>Learn the business behind the stitches.</h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/80">Video lessons, live classes and certificates, all free and all on Sewsiness. Learn at your own pace, and come back any day to carry on.</p>
          <div className="mt-8 max-w-2xl"><ContinueLearning tone="dark" /></div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-2"><PlayCircle className="size-4 text-[#f2c14e]" /> Watch on your phone</span>
            <span className="flex items-center gap-2"><Award className="size-4 text-[#f2c14e]" /> Certificate you can verify</span>
            <Link href="/academy/me" className="font-bold text-white underline">My learning</Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className={`${heading} text-4xl font-semibold text-[#35121d] sm:text-5xl`}>Courses</h2>
          {courses.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-[#e6d6d8] bg-white p-10 text-center text-sm leading-7 text-[#6F565D]">The first courses are being recorded. Join the <a href={CONTACT.community} className="font-bold text-[#800020] underline">WhatsApp community</a> and you will hear the moment they open.</p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <Link key={c.id} href={`/academy/${c.slug}`} className="group overflow-hidden rounded-[1.6rem] border border-[#e6d6d8] bg-white transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(59,10,24,.12)]">
                  <CourseCover course={c} className="aspect-[5/3] w-full" />
                  <div className="p-6">
                    <h3 className={`${heading} text-3xl font-semibold leading-tight text-[#35121d] group-hover:text-[#800020]`}>{c.title}</h3>
                    {c.subtitle && <p className="mt-2 text-sm leading-6 text-[#6F565D]">{c.subtitle}</p>}
                    <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#6F565D]">
                      <span className="flex items-center gap-1.5"><PlayCircle className="size-3.5" />{c.lessonCount} lessons</span>
                      {c.minutes > 0 && <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{c.minutes} min</span>}
                      {c.learners > 0 && <span className="flex items-center gap-1.5"><Users className="size-3.5" />{c.learners} learning</span>}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="live" className="scroll-mt-24 bg-[#f5ece8] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <h2 className={`${heading} text-4xl font-semibold text-[#35121d] sm:text-5xl`}>Live classes</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6F565D]">Join with your email, no app to install. Ask questions in the class chat and the host answers them.</p>
          <div className="mt-8"><TrainingSessions sessions={upcoming} emptyText="No live class is scheduled right now. Join our WhatsApp community to hear about the next one first." /></div>
          {replays.length > 0 && <><h3 className={`${heading} mt-16 text-3xl font-semibold text-[#35121d]`}>Watch a past class</h3><div className="mt-6"><TrainingSessions sessions={replays} /></div></>}
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <p className="mx-auto max-w-7xl text-sm text-[#6F565D]">Hiring someone who says they studied with us? <Link href="/academy/verify" className="font-bold text-[#800020] underline">Check a certificate number</Link>.</p>
      </section>
    </SiteShell>
  );
}
