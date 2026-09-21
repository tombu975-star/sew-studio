"use client";

import { useEffect, useState } from "react";
import { Scissors, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { label: "Madam (Owner)", email: "madam@studio.com", role: "madam" },
  { label: "Staff", email: "akos@studio.com", role: "staff" },
  { label: "Staff", email: "yaw@studio.com", role: "staff" },
];

export function LoginPage() {
  const { login, hydrate, status } = useAuth();
  const [email, setEmail] = useState("madam@studio.com");
  const [password, setPassword] = useState("atelier2025");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // If a session cookie exists, hydrate so we don't show login needlessly.
  useEffect(() => {
    if (status === "loading") hydrate();
  }, [status, hydrate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0]}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not sign in.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("atelier2025");
    setError("");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FBF9F7]">
      {/* Editorial left panel */}
      <div className="relative md:w-[45%] lg:w-[42%] min-h-[280px] md:min-h-screen overflow-hidden bg-[#800020]">
        <img
          src="/atelier-login.jpg"
          alt="Atelier studio interior"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#800020]/85 via-[#6b0018]/60 to-[#1C1917]/70" />
        <div className="relative h-full flex flex-col justify-between p-8 md:p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border border-white/60 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-display text-2xl font-semibold tracking-tight">
              Madam Studio
            </span>
          </div>

          <div className="max-w-md">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-4">
              Bespoke Atelier · Est. Accra
            </p>
            <h1 className="font-display font-semibold leading-[1.05]" style={{ fontSize: "clamp(32px, 4.5vw, 52px)" }}>
              Where every stitch tells a story.
            </h1>
            <p className="mt-5 text-sm text-white/70 leading-relaxed max-w-sm">
              The studio's command center — clients, orders, fittings, production
              and an AI style assistant, all in one elegant atelier.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-white/50">
            <span>Clients</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Orders</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Style Assist</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Production</span>
          </div>
        </div>
      </div>

      {/* Login form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-8 text-[#800020]">
            <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="font-display text-xl font-semibold">Madam Studio</span>
          </div>

          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-3">
              Sign in
            </p>
            <h2 className="font-display font-semibold text-[#1C1917] leading-tight" style={{ fontSize: "clamp(28px, 4vw, 36px)" }}>
              Welcome back to the atelier
            </h2>
            <p className="text-sm text-stone-500 mt-2">
              Enter your studio credentials to continue.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#E7E5E4] rounded-sm text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/10 transition"
                  placeholder="you@studio.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-500 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-[#E7E5E4] rounded-sm text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/10 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-[#800020] bg-[#800020]/5 border border-[#800020]/15 rounded-sm px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#800020] text-white text-sm font-medium rounded-sm hover:bg-[#6b0018] disabled:opacity-60 disabled:cursor-not-allowed transition group"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 pt-6 border-t border-[#E7E5E4]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-3">
              Demo accounts · password <span className="text-stone-600">atelier2025</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  className="text-left px-3 py-2.5 bg-white border border-[#E7E5E4] rounded-sm hover:border-[#800020]/40 hover:bg-[#FBF9F7] transition group"
                >
                  <p className="text-xs font-medium text-[#1C1917] group-hover:text-[#800020]">
                    {d.label}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5 truncate">{d.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
