"use client";

import { Download } from "lucide-react";
import { useAuth } from "@/stores/auth";

/** Download customers / orders as CSV. Works in view-only mode. Owner and trainer only. */
export function ExportButtons({ compact = false }: { compact?: boolean }) {
  const role = useAuth((state) => state.user?.role);
  if (role !== "madam" && role !== "trainer") return null;
  const cls = compact
    ? "inline-flex h-8 items-center gap-1.5 rounded-md border border-[#D9B3BC] bg-white px-3 text-xs font-semibold text-[#650019] hover:bg-[#FBF1F3]"
    : "inline-flex h-10 items-center gap-2 rounded-lg border border-[#E6D4D8] bg-white px-4 text-sm font-semibold text-[#650019] hover:bg-[#FBF1F3]";
  return (
    <span className="inline-flex flex-wrap gap-2">
      <a href="/api/export/customers" download className={cls}><Download className="size-3.5" />Export customers</a>
      <a href="/api/export/orders" download className={cls}><Download className="size-3.5" />Export orders</a>
    </span>
  );
}
