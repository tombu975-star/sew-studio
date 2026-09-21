"use client";

import { useEffect, useState } from "react";
import {
  Scissors,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

export function LoginPage() {
  const { login, hydrate, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      {/* Top hero band — app-style header */}
      <div className="relative h-[42vh] min-h-[300px] overflow-hidden bg-[#800020] shrink-0">
        <img
          src="/atelier-login.jpg"
          alt="Atelier studio interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#800020]/85 via-[#6b0018]/65 to-[#1C1917]/80" />
        {/* subtle grain */}
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        {/* fade into the form below */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#faf8f5]" />

        <div className="relative h-full flex flex-col items-center justify-center text-white px-6 text-center">
          <div className="w-14 h-14 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-sm bg-white/5 animate-fade-in-up">
            <Scissors className="w-6 h-6" />
          </div>
          <h1
            className="font-display font-semibold mt-4 animate-fade-in-up"
            style={{ fontSize: "clamp(30px, 7vw, 40px)", animationDelay: "0.05s" }}
          >
            Madam Studio
          </h1>
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-white/60 mt-2.5 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Bespoke Atelier · Accra
          </p>
        </div>
      </div>

      {/* Form section — mobile-first, centered */}
      <div className="flex-1 flex items-start justify-center px-6 pt-2 pb-10 -mt-6 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          {/* Welcome card */}
          <div className="mb-7">
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-2 flex items-center gap-2">
              <span className="w-5 h-px bg-stone-300" />
              Sign in
            </p>
            <h2
              className="font-display font-semibold text-[#1C1917] leading-[1.1]"
              style={{ fontSize: "clamp(26px, 6vw, 32px)" }}
            >
              Welcome back
            </h2>
            <p className="text-sm text-stone-500 mt-2">
              Sign in to your studio to continue.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2"
              >
                Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#800020] transition-colors" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 h-12 bg-white border border-[#E7E5E4] rounded-xl text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/8 transition-all elevate-sm"
                  placeholder="you@studio.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2"
              >
                Password
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#800020] transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 h-12 bg-white border border-[#E7E5E4] rounded-xl text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/8 transition-all elevate-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-[#800020] bg-[#800020]/5 border border-[#800020]/15 rounded-xl px-3.5 py-2.5 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-[#800020] mt-1.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 h-12 px-5 bg-[#800020] text-white text-sm font-medium rounded-xl hover:bg-[#6b0018] disabled:opacity-60 disabled:cursor-not-allowed transition-all elevate-burgundy hover:translate-y-[-1px] group mt-1"
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

          {/* Subtle footer */}
          <p className="text-center text-[11px] text-stone-400 mt-8 leading-relaxed">
            Madam Studio — where every stitch tells a story.
          </p>
        </div>
      </div>
    </div>
  );
}
