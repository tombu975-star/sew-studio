import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { SignInPanel } from "@/components/academy/SignInPanel";
import { getLearner, safeNext } from "@/lib/academy/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in to the Academy", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getLearner()) redirect(next);
  return (
    <SiteShell>
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-md">
          {sp.expired && <p role="alert" className="mb-4 rounded-xl bg-[#fff4e5] px-4 py-3 text-sm text-[#7a4a00]">That sign-in link has expired or was already used. Ask for a new code below.</p>}
          <SignInPanel next={next} />
        </div>
      </section>
    </SiteShell>
  );
}
