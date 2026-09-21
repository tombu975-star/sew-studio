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
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { label: "Madam", sub: "Owner", email: "madam@studio.com", role: "madam" },
  { label: "Akos", sub: "Atelier staff", email: "akos@studio.com", role: "staff" },
  { label: "Yaw", sub: "Atelier staff", email: "yaw@studio.com", role: "staff" },
];

export function LoginPage() {
  const { login, hydrate, status } = useAuth();
  const [email, setEmail] = useState("madam@studio.com");
  const [password, setPassword] = useState("atelier2025");
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

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("atelier2025");
    setError("");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#faf8f5]">
      {/* Editorial left panel */}
      <div className="relative md:w-[46%] lg:w-[44%] min-h-[300px] md:min-h-screen overflow-hidden bg-[#800020]">
        <img
          src="/atelier-login.jpg"
          alt="Atelier studio interior"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#800020]/80 via-[#6b0018]/55 to-[#1C1917]/75" />
        {/* subtle grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative h-full flex flex-col justify-between p-8 md:p-12 lg:p-16 text-white">
          <div className="flex items-center gap-3 animate-fade-in-up">
            <div className="w-11 h-11 rounded-full border border-white/50 flex items-center justify-center backdrop-blur-sm bg-white/5">
              <Scissors className="w-5 h-5" />
            </div>
            <span className="font-display text-2xl font-semibold tracking-tight">
              Madam Studio
            </span>
          </div>

          <div className="max-w-lg animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/55 mb-5 flex items-center gap-2">
              <span className="w-8 h-px bg-white/30" />
              Bespoke Atelier · Accra
            </p>
            <h1
              className="font-display font-semibold leading-[1.02]"
              style={{ fontSize: "clamp(34px, 5vw, 56px)" }}
            >
              Where every stitch
              <br />
              tells a story.
            </h1>
            <p className="mt-6 text-[15px] text-white/75 leading-relaxed max-w-md">
              The studio's command center — clients, orders, fittings,
              production and an AI style assistant, woven into one elegant
              atelier.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/45 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            {["Clients", "Orders", "Style Assist", "Production"].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-white/25" />}
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Login form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-8 text-[#800020]">
            <div className="w-10 h-10 rounded-full border border-[#800020] flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="font-display text-xl font-semibold">Madam Studio</span>
          </div>

          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-3 flex items-center gap-2">
              <span className="w-6 h-px bg-stone-300" />
              Sign in
            </p>
            <h2
              className="font-display font-semibold text-[#1C1917] leading-[1.1]"
              style={{ fontSize: "clamp(28px, 4vw, 36px)" }}
            >
              Welcome back to
              <br />
              the atelier
            </h2>
            <p className="text-sm text-stone-500 mt-3">
              Enter your studio credentials to continue.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
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
                  className="w-full pl-10 pr-4 h-12 bg-white border border-[#E7E5E4] rounded-lg text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/8 transition-all"
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
                  className="w-full pl-10 pr-11 h-12 bg-white border border-[#E7E5E4] rounded-lg text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/8 transition-all"
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
              <div className="flex items-start gap-2 text-sm text-[#800020] bg-[#800020]/5 border border-[#800020]/15 rounded-lg px-3.5 py-2.5 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-[#800020] mt-1.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 h-12 px-5 bg-[#800020] text-white text-sm font-medium rounded-lg hover:bg-[#6b0018] disabled:opacity-60 disabled:cursor-not-allowed transition-all elevate-burgundy hover:translate-y-[-1px] group"
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Demo accounts · password{" "}
              <span className="text-stone-600 font-medium">atelier2025</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  className="text-left px-3 py-2.5 bg-white border border-[#E7E5E4] rounded-lg hover:border-[#800020]/40 hover:bg-[#faf8f5] hover:-translate-y-0.5 transition-all group"
                >
                  <p className="text-xs font-semibold text-[#1C1917] group-hover:text-[#800020] transition-colors">
                    {d.label}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{d.sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
