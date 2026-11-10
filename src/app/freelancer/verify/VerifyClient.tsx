"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { PlatformLogin } from "@/components/atelier/PlatformLogin";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { VerifiedBadge } from "@/components/atelier/VerifiedBadge";
import { apiErrorMessage, apiPost } from "@/lib/api";

export function VerifyClient() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setState("error"); setMessage("This verification link is incomplete."); return; }
    apiPost("/api/freelancer-auth/verify", { token })
      .then(() => setState("ok"))
      .catch((e) => { setState("error"); setMessage(apiErrorMessage(e, "Could not verify your email.")); });
  }, [token]);

  return (
    <PlatformLogin
      subtitle="Freelancer portal"
      eyebrow="Email verification"
      heading="One quick check."
      description="Verified freelancers get a badge studios can trust, and can apply for open jobs."
    >
      <div className="animate-fade-in text-center sm:text-left">
        {state === "working" && (
          <div className="flex items-center gap-3 text-[#756a64] max-sm:text-white"><Loader2 className="size-5 animate-spin" /> Verifying your email…</div>
        )}
        {state === "ok" && (
          <>
            <VerifiedBadge />
            <h2 className="mt-4 font-serif text-3xl font-medium tracking-tight text-[#302623] max-sm:text-white">You're verified</h2>
            <p className="mt-2 text-sm leading-6 text-[#756a64] max-sm:text-white/85">Your email is confirmed and your Verified badge is live. You can now apply for open jobs.</p>
            <a href="/freelancer" className="mt-6 inline-block"><PremiumButton size="lg">Go to your portal</PremiumButton></a>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="size-8 text-[#8f2933] max-sm:text-white" />
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-[#302623] max-sm:text-white">Link problem</h2>
            <p className="mt-2 text-sm leading-6 text-[#756a64] max-sm:text-white/85">{message}</p>
            <a href="/freelancer" className="mt-6 inline-block"><PremiumButton size="lg" variant="outline">Sign in to request a new link</PremiumButton></a>
          </>
        )}
      </div>
    </PlatformLogin>
  );
}
