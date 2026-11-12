import type { Metadata } from "next";
import { TrainingsAdmin } from "./TrainingsAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Public trainings", robots: { index: false, follow: false } };

export default function TrainingsAdminPage() {
  return <TrainingsAdmin />;
}
