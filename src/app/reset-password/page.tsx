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
    <section className="w-full max-w-md rounded-lg border border-[#E7E5E4] bg-white p-6 sm:p-8">
      <div className="mb-8 text-center sm:text-left">
          <div className="mb-8 flex items-center justify-center gap-3 sm:justify-start">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#800020] text-white"><Scissors className="size-4" /></div>
            <span className="font-display text-xl font-semibold text-[#1C1917]">Madam Studio</span>
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-none text-[#1C1917]">Choose a new password</h1>
      </div>

      {complete ? (
        <div className="space-y-4">
          <p role="status" className="text-sm text-emerald-800">Your password has been updated.</p>
          <a href="/" className="block rounded-md bg-[#800020] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#6b0018]">Continue to studio</a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label htmlFor="new-password" className="block text-[13px] font-medium text-[#1C1917]">New password</label>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-md border border-[#E7E5E4] pl-10 pr-3 text-sm outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15" />
          </div>
          <label htmlFor="confirm-password" className="block text-[13px] font-medium text-[#1C1917]">Confirm password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 w-full rounded-md border border-[#E7E5E4] px-3 text-sm outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15" />
          {error && <p role="alert" className="rounded-md border border-[#800020]/20 bg-[#800020]/5 px-3.5 py-2.5 text-sm text-[#800020]">{error}</p>}
          <button disabled={loading} className="h-11 w-full rounded-md bg-[#800020] text-sm font-medium text-white hover:bg-[#6b0018] disabled:opacity-60">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#faf8f5] px-5 py-10 pt-safe pb-safe">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
