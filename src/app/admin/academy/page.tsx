import type { Metadata } from "next";
import { AcademyAdmin } from "./AcademyAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Academy", robots: { index: false, follow: false } };

export default function AcademyAdminPage() {
  return <AcademyAdmin />;
}
