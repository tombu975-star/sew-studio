import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata: Metadata = { title: "Check a certificate" };

export default function VerifyIndex() {
  return (
    <SiteShell>
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-xl">
          <h1 className="font-[family-name:var(--font-serif)] text-5xl font-semibold text-[#35121d]">Check a certificate</h1>
          <p className="mt-4 text-sm leading-7 text-[#6F565D]">Every Sewsiness Academy certificate has a number like SEW-ABCD-EFGH. Enter it to confirm who earned it and when.</p>
          <form action="/academy/verify/go" className="mt-8 flex gap-3">
            <input name="code" required pattern="SEW-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}" placeholder="SEW-ABCD-EFGH" aria-label="Certificate number" className="h-12 min-w-0 flex-1 rounded-xl border border-[#d9bdc4] bg-white px-4 text-sm uppercase outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10" />
            <button className="h-12 rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#650019]">Check</button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}
