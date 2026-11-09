"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockKeyhole, Scissors } from "lucide-react";
import { apiPost } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(searchParams.get("error") ? "This reset link is invalid or expired. Request another link." : "");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/auth/reset-password", { password });
      setComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message.split("—").at(-1)?.trim() || "Could not reset password." : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-[#E2E8F0] bg-white p-6 sm:p-8">
      <div className="mb-8 text-center sm:text-left">
          <div className="mb-8 flex items-center justify-center gap-3 sm:justify-start">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#2563EB] text-white"><Scissors className="size-4" /></div>
            <span className="font-display text-xl font-semibold text-[#0F172A]">Madam Studio</span>
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-none text-[#0F172A]">Choose a new password</h1>
      </div>

      {complete ? (
        <div className="space-y-4">
          <p role="status" className="text-sm text-emerald-800">Your password has been updated.</p>
          <a href="/" className="block rounded-md bg-[#2563EB] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#1D4ED8]">Continue to studio</a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label htmlFor="new-password" className="block text-[13px] font-medium text-[#0F172A]">New password</label>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-[#E2E8F0] pl-10 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15" />
          </div>
          <label htmlFor="confirm-password" className="block text-[13px] font-medium text-[#0F172A]">Confirm password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 w-full rounded-md border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15" />
          {error && <p role="alert" className="rounded-md border border-[#2563EB]/20 bg-[#2563EB]/5 px-3.5 py-2.5 text-sm text-[#2563EB]">{error}</p>}
          <button disabled={loading} className="h-11 w-full rounded-md bg-[#2563EB] text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-60">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#F8FAFC] px-5 py-10 pt-safe pb-safe">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
