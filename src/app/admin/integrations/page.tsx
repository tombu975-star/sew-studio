import type { Metadata } from "next";
import { IntegrationsAdmin } from "./IntegrationsAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Integrations", robots: { index: false, follow: false } };

export default function IntegrationsAdminPage() {
  return <IntegrationsAdmin />;
}
