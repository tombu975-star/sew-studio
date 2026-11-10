"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import type { FreelancerProfile } from "./types";

/** Shown until the freelancer confirms their email. */
export function VerifyBanner({ onVerified }: { onVerified: (p: FreelancerProfile) => void }) {
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  async function resend() {
    setSending(true);
    try {
      const r = await apiPost<{ emailSent?: boolean; alreadyVerified?: boolean }>("/api/freelancer-auth/resend-verification", {});
      if (r.alreadyVerified) return check();
      toast.success(r.emailSent ? "Verification email sent. Check your inbox." : "We couldn't send the email right now. Please try again shortly.");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not send the verification email."));
    } finally {
      setSending(false);
    }
  }
  async function check() {
    setChecking(true);
    try {
      const p = await apiGet<FreelancerProfile>("/api/freelancer-auth/me");
      onVerified(p);
      if (!p.verified) toast.info("Not verified yet. Open the link in your email, then check again.");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not check your status."));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div role="status" className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Verify your email to get your badge</p>
          <p className="text-xs text-amber-800">Until you verify, studios can't find you and you can't apply for open jobs.</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <PremiumButton size="sm" loading={sending} onClick={resend}>Resend email</PremiumButton>
        <PremiumButton size="sm" variant="outline" loading={checking} onClick={check}>I've verified</PremiumButton>
      </div>
    </div>
  );
}
