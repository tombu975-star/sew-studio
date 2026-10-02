import { Suspense } from "react";
import { AdminPortalClient } from "./AdminPortalClient";

export const dynamic = "force-dynamic";

export default function AdminPortalPage() {
  return (
    <Suspense fallback={null}>
      <AdminPortalClient />
    </Suspense>
  );
}
