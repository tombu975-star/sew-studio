"use client";

import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { BrandMark } from "@/components/atelier/BrandMark";
import { apiPost } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiPost("/api/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("We could not send the reset email. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#FAF8FC] px-5 py-10 pt-safe pb-safe">
      <section className="w-full max-w-md rounded-lg border border-[#E6DFEE] bg-white p-6 sm:p-8">
        <div className="mb-8 text-center sm:text-left">
          <div className="mb-8 flex items-center justify-center gap-3 sm:justify-start">
            <BrandMark size={44} />
            <span className="font-display text-xl font-semibold text-[#1F1430]">Sewiness</span>
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-none text-[#1F1430]">Reset your password</h1>
          <p className="mt-2 text-sm text-stone-500">We’ll email a secure link if an account matches.</p>
        </div>

        {sent ? (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            If an account exists for that email, a password reset link is on its way.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label htmlFor="recovery-email" className="block text-[13px] font-medium text-[#1F1430]">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-md border border-[#E6DFEE] bg-white pl-10 pr-3 text-sm text-[#1F1430] outline-none focus:border-[#6A1FA0] focus:ring-2 focus:ring-[#6A1FA0]/15"
              />
            </div>
            {error && <p role="alert" className="rounded-md border border-[#6A1FA0]/20 bg-[#6A1FA0]/5 px-3.5 py-2.5 text-sm text-[#6A1FA0]">{error}</p>}
            <button disabled={loading} className="h-11 w-full rounded-md bg-[#6A1FA0] text-sm font-medium text-white hover:bg-[#571A84] disabled:opacity-60">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <a href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-[#6A1FA0]">
          <ArrowLeft className="size-4" /> Back to sign in
        </a>
      </section>
    </main>
  );
}