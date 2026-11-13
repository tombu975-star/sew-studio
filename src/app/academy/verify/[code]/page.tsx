import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, SearchX } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { getPool } from "@/lib/db/pool";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Certificate check", robots: { index: false } };

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const valid = /^SEW-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
  const row = valid ? (await getPool().query("select learner_name, course_title, issued_at from public.academy_certificates where code = $1", [code])).rows[0] : null;
  return (
    <SiteShell>
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          {row ? (
            <>
              <BadgeCheck className="mx-auto size-14 text-emerald-600" aria-hidden="true" />
              <h1 className="mt-5 font-[family-name:var(--font-serif)] text-5xl font-semibold text-[#35121d]">This certificate is genuine</h1>
              <div className="mt-8 rounded-[1.6rem] border border-[#e6d6d8] bg-white p-8 text-left">
                <p className="text-sm text-[#6F565D]">Awarded to</p><p className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#35121d]">{row.learner_name}</p>
                <p className="mt-5 text-sm text-[#6F565D]">For completing</p><p className="text-lg font-bold text-[#800020]">{row.course_title}</p>
                <p className="mt-5 text-sm text-[#6F565D]">Issued {new Date(row.issued_at).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })} · Number {code}</p>
              </div>
              <a href={`/api/academy/certificates/${code}/pdf`} target="_blank" rel="noopener" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#800020] px-7 text-sm font-bold text-white hover:bg-[#650019]">View the certificate</a>
            </>
          ) : (
            <>
              <SearchX className="mx-auto size-14 text-[#b08b94]" aria-hidden="true" />
              <h1 className="mt-5 font-[family-name:var(--font-serif)] text-5xl font-semibold text-[#35121d]">We could not find that certificate</h1>
              <p className="mt-4 text-sm leading-7 text-[#6F565D]">Check the number for typing mistakes. It looks like SEW-ABCD-EFGH.</p>
              <Link href="/academy/verify" className="mt-6 inline-flex h-12 items-center rounded-full border border-[#d9bdc4] px-7 text-sm font-bold text-[#800020]">Try another number</Link>
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
