import { Suspense } from "react";
import { FreelancerPortalClient } from "./FreelancerPortalClient";

export const dynamic = "force-dynamic";

export default function FreelancerPortalPage() {
  return (
    <Suspense fallback={null}>
      <FreelancerPortalClient />
    </Suspense>
  );
}
