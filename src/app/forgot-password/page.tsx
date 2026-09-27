"use client";

import { useState } from "react";
import { ArrowLeft, Mail, Scissors } from "lucide-react";
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
    <main className="min-h-dvh flex items-center justify-center bg-[#faf8f5] px-5 py-10">
      <section className="w-full max-w-md rounded-xl border border-[#E7E5E4] bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[#800020] text-white">
            <Scissors className="size-5" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Madam Studio</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[#1C1917]">Reset your password</h1>
          <p className="mt-2 text-sm text-stone-500">We’ll email a secure link if an account matches.</p>
        </div>

        {sent ? (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            If an account exists for that email, a password reset link is on its way.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label htmlFor="recovery-email" className="block text-xs font-medium text-stone-600">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-lg border border-[#E7E5E4] bg-white pl-10 pr-3 text-sm text-[#1C1917] outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15"
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="h-11 w-full rounded-lg bg-[#800020] text-sm font-medium text-white hover:bg-[#6b0018] disabled:opacity-60">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <a href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-[#800020]">
          <ArrowLeft className="size-4" /> Back to sign in
        </a>
      </section>
    </main>
  );
}