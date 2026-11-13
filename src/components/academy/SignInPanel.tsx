"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";

const field = "mt-1.5 h-12 w-full rounded-xl border border-[#d9bdc4] bg-white px-4 text-sm text-[#2F151B] outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10";

/** Email-code sign-in for learners. No password to remember, no account to set up first. */
export function SignInPanel({ next = "/academy/me", onSignedIn, intro }: { next?: string; onSignedIn?: () => void; intro?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  }

  async function sendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      const mail = String(f.get("email") ?? "").trim().toLowerCase();
      await post("/api/academy/auth/request", { email: mail, name: f.get("name"), next, website: f.get("website") });
      setEmail(mail); setStep("code");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError("");
    try {
      await post("/api/academy/auth/verify", { email, code: f.get("code") });
      if (onSignedIn) onSignedIn(); else window.location.assign(next);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); setBusy(false); }
  }

  return (
    <div className="rounded-[1.6rem] border border-[#e6d6d8] bg-white p-7 shadow-[0_20px_60px_rgba(59,10,24,.08)] sm:p-9">
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#35121d]">Sign in to learn</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F565D]">{intro ?? "Enter your email and we will send you a 6-digit code. New here? The same step creates your free account."}</p>
          </div>
          <label className="block text-sm font-semibold text-[#5b303c]">Your name (first time only)<input name="name" maxLength={120} autoComplete="name" className={field} /></label>
          <label className="block text-sm font-semibold text-[#5b303c]">Email address<input name="email" type="email" required maxLength={254} autoComplete="email" className={field} /></label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          <button disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#800020] text-sm font-bold text-white transition hover:bg-[#650019] disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#35121d]">Check your email</h2>
            <p className="mt-2 text-sm leading-6 text-[#6F565D]">We sent a 6-digit code to <strong className="text-[#5b303c]">{email}</strong>. It works for 15 minutes. Check your spam folder if it does not arrive.</p>
          </div>
          <label className="block text-sm font-semibold text-[#5b303c]">6-digit code
            <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus className={`${field} text-center text-2xl font-semibold tracking-[.5em]`} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          <button disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#800020] text-sm font-bold text-white transition hover:bg-[#650019] disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} Continue
          </button>
          <button type="button" onClick={() => { setStep("email"); setError(""); }} className="w-full text-center text-sm font-semibold text-[#800020] underline">Use a different email</button>
        </form>
      )}
    </div>
  );
}
