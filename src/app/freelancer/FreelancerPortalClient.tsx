"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { FreelancerDashboard } from "./FreelancerDashboard";
import { FreelancerLogin } from "./FreelancerLogin";
import type { FreelancerProfile } from "./types";

export function FreelancerPortalClient() {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);

  useEffect(() => {
    apiGet<FreelancerProfile>("/api/freelancer-auth/me")
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }
  if (!profile) return <FreelancerLogin onLoggedIn={setProfile} />;
  return <FreelancerDashboard profile={profile} onProfileChange={setProfile} onLogout={() => setProfile(null)} />;
}
