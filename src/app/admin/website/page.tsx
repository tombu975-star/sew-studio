import type { Metadata } from "next";
import { WebsiteEditor } from "./WebsiteEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Website content", robots: { index: false, follow: false } };

export default function WebsiteAdminPage() {
  return <WebsiteEditor />;
}
