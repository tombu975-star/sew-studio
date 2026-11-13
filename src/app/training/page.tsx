import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell, eyebrow, heading } from "@/components/site/SiteShell";
import { TrainingSessions } from "@/components/site/TrainingSessions";
import { CONTACT, SITE } from "@/lib/site-config";
import { isPastSession, loadPublicTrainings } from "@/lib/public-trainings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Free training and webinars",
  description: "Free webinars and training for fashion graduates, tailors and studio owners. Sign up with your name and email. No account needed.",
};

export default async function TrainingPage() {
  const all = await loadPublicTrainings();
  const upcoming = all.filter((s) => !isPastSession(s));
  const past = all.filter((s) => isPastSession(s) && s.hasReplay).reverse();
  return (
    <SiteShell>
      <section className="bg-[#f5ece8] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className={eyebrow}>Sponsored by Sewsiness</p>
          <h1 className={`${heading} mt-4 max-w-3xl text-5xl font-semibold leading-[1.04] text-[#35121d] sm:text-6xl`}>Free training for people who sew for a living</h1>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-[#6F565D] sm:text-base">Practical webinars on getting your first paying clients, pricing properly and running your business with confidence. Pick a session, sign up with your name and email, and we will send you the link. You do not need an account.</p>
        </div>
      </section>
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className={`${heading} text-4xl font-semibold text-[#35121d]`}>Upcoming sessions</h2>
          <div className="mt-8"><TrainingSessions sessions={upcoming} emptyText="No sessions are scheduled right now. Join our WhatsApp community to hear about the next one first." /></div>
          {past.length > 0 && (<>
            <h2 className={`${heading} mt-20 text-4xl font-semibold text-[#35121d]`}>Watch a past session</h2>
            <div className="mt-8"><TrainingSessions sessions={past} /></div>
          </>)}
          <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[1.6rem] border border-[#e6d6d8] bg-white p-7">
            <p className="min-w-0 basis-full text-sm leading-7 text-[#5f4b50] sm:flex-1 sm:basis-0">Want to hear about new sessions first? <a href={CONTACT.community} className="font-bold text-[#800020] underline">Join the WhatsApp community</a>, or try the studio app free for two months.</p>
            <a href={SITE.studioUrl} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#650019]">Create your account <ArrowRight className="size-4" /></a>
            <Link href="/" className="text-sm font-bold text-[#800020] underline">Back to home</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
