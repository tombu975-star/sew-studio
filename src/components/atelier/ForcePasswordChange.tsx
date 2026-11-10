"use client";

import { useState } from "react";
import { useAuth } from "@/stores/auth";
import { apiPost } from "@/lib/api";

/**
 * Blocking overlay shown after signing in with an owner-issued temporary
 * password. Disappears once the member sets their own password.
 */
export function ForcePasswordChange() {
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const logout = useAuth((s) => s.logout);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user?.mustChangePassword) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 8) return setError("Use a new password with at least 8 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current) return setError("Choose a password different from the temporary one.");
    setBusy(true);
    try {
      await apiPost("/api/auth/change-password", { currentPassword: current, newPassword: next });
      await hydrate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  const input = "h-11 w-full rounded-md border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#2563EB]";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Set your own password</h2>
        <p className="text-sm text-stone-500">
          You signed in with a temporary password. Choose a new one to continue.
        </p>
        <input type="password" autoComplete="current-password" placeholder="Temporary password" required
          value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
        <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" minLength={8} required
          value={next} onChange={(e) => setNext(e.target.value)} className={input} />
        <input type="password" autoComplete="new-password" placeholder="Confirm new password" minLength={8} required
          value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy}
          className="h-11 w-full rounded-md bg-[#2563EB] text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Saving…" : "Save password"}
        </button>
        <button type="button" onClick={() => logout()} className="w-full text-xs text-stone-400">Sign out</button>
      </form>
    </div>
  );
}
