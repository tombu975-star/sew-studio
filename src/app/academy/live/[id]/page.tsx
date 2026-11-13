import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { LiveRoom } from "@/components/academy/LiveRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live class", robots: { index: false } };

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SiteShell><LiveRoom id={id} /></SiteShell>;
}
