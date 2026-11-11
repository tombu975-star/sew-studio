import { Suspense } from "react";
import { AdminPortalClient } from "./AdminPortalClient";

export const dynamic = "force-dynamic";

export default function AdminPortalPage() {
  return (
    <>
      <a href="/admin/website" className="fixed bottom-4 right-[190px] z-[60] rounded-full border border-[#E8D8DD] bg-white px-4 py-2.5 text-xs font-semibold text-[#782F43] shadow-lg transition hover:bg-[#FAF4F5]">
        Website content
      </a>
      <a href="/admin/experience" className="fixed bottom-4 right-4 z-[60] rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#315B4A] shadow-lg transition hover:bg-[#F5F8F5]">
        Experience & releases
      </a>
      <Suspense fallback={null}>
        <AdminPortalClient />
      </Suspense>
    </>
  );
}
