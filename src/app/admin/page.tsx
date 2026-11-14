import { Suspense } from "react";
import { AdminPortalClient } from "./AdminPortalClient";

export const dynamic = "force-dynamic";

export default function AdminPortalPage() {
  return (
    <>
      <div className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-wrap justify-end gap-2">
        <a href="/admin/academy" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#650019] shadow-lg transition hover:bg-[#FBF1F3]">
          Academy
        </a>
        <a href="/admin/trainings" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#650019] shadow-lg transition hover:bg-[#FBF1F3]">
          Public trainings
        </a>
        <a href="/admin/website" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#650019] shadow-lg transition hover:bg-[#FBF1F3]">
          Website content
        </a>
        <a href="/admin/integrations" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#650019] shadow-lg transition hover:bg-[#FBF1F3]">
          Integrations & keys
        </a>
        <a href="/admin/experience" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#650019] shadow-lg transition hover:bg-[#FBF1F3]">
          Experience & releases
        </a>
      </div>
      <Suspense fallback={null}>
        <AdminPortalClient />
      </Suspense>
    </>
  );
}
