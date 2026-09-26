"use client";

import { useEffect, useState } from "react";
import {
  Scissors,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Store,
  User as UserIcon,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "login" | "register";

/**
 * api.ts throws errors like `"409 Conflict — {"error":"..."}"`.
 * Pull a clean user-facing message out of that payload.
 */
function extractApiError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const m = err.message;
    const idx = m.indexOf("—");
    if (idx >= 0) {
      const payload = m.slice(idx + 1).trim();
      try {
        const parsed = JSON.parse(payload);
        if (parsed?.error) return String(parsed.error);
      } catch {
        if (payload) return payload;
      }
    }
    return m || fallback;
  }
  return fallback;
}

const inputClass =
  "w-full pl-10 pr-4 h-12 bg-white border border-[#E7E5E4] rounded-xl text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/8 transition-all elevate-sm";

export function LoginPage() {
  const { login, register, hydrate, status } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  // shared / login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // register-only state
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<string>("Female");

  useEffect(() => {
    if (status === "loading") hydrate();
  }, [status, hydrate]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0]}.`);
    } catch (err) {
      const msg = extractApiError(err, "Could not sign in.");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!shopName.trim() || !fullName.trim() || !email.trim()) {
      const msg = "Please fill in all required fields.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        shopName: shopName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        gender,
      });
      const shopLabel = user.shop?.name || shopName.trim();
      toast.success(`Welcome to ${shopLabel}!`);
    } catch (err) {
      const msg = extractApiError(err, "Could not create your shop.");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#faf8f5] pl-safe pr-safe">
      {/* Top hero band — app-style header */}
      <div className="relative h-[38vh] sm:h-[42vh] min-h-[220px] max-h-[340px] overflow-hidden bg-[#800020] shrink-0 pt-safe">
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
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-sm bg-white/5 animate-fade-in-up shrink-0">
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h1
            className="font-display font-semibold mt-3 sm:mt-4 animate-fade-in-up"
            style={{ fontSize: "clamp(28px, 7vw, 40px)", animationDelay: "0.05s" }}
          >
            Madam Studio
          </h1>
          <p
            className="text-[10px] uppercase tracking-[0.3em] text-white/60 mt-2 sm:mt-2.5 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Bespoke Atelier · Accra
          </p>
        </div>
      </div>

      {/* Form section — mobile-first, centered */}
      <div className="flex-1 flex items-start justify-center px-5 sm:px-6 pt-2 pb-safe pb-10 -mt-6 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          {mode === "login" ? (
            <div key="login" className="animate-fade-in-up">
              {/* Welcome card */}
              <div className="mb-6">
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

              <form onSubmit={submitLogin} className="space-y-4">
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
                      className={inputClass}
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

                <PremiumButton
                  type="submit"
                  size="lg"
                  loading={submitting}
                  className="w-full mt-1 group"
                >
                  {submitting ? (
                    "Signing in…"
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                    </>
                  )}
                </PremiumButton>
              </form>

              {/* Subtle secondary link to create a new shop */}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="mt-6 w-full inline-flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition-colors group"
              >
                <Store className="w-3.5 h-3.5" />
                Opening a new atelier?
                <span className="font-semibold text-[#800020] underline-offset-4 group-hover:underline">
                  Create a shop
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          ) : (
            <div key="register" className="animate-fade-in-up">
              {/* Heading */}
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 mb-2 flex items-center gap-2">
                  <span className="w-5 h-px bg-stone-300" />
                  Register
                </p>
                <h2
                  className="font-display font-semibold text-[#1C1917] leading-[1.1]"
                  style={{ fontSize: "clamp(26px, 6vw, 32px)" }}
                >
                  Create your shop
                </h2>
                <p className="text-sm text-stone-500 mt-2">
                  Open a new atelier — your studio, your clients, your craft.
                </p>
              </div>

              <form onSubmit={submitRegister} className="space-y-4">
                {/* Shop name */}
                <div>
                  <label
                    htmlFor="shopName"
                    className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2"
                  >
                    Shop name <span className="text-[#800020]">*</span>
                  </label>
                  <div className="relative group">
                    <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#800020] transition-colors" />
                    <input
                      id="shopName"
                      type="text"
                      required
                      autoComplete="organization"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className={inputClass}
                      placeholder="Esi Atelier"
                    />
                  </div>
                </div>

                {/* Your name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2"
                  >
                    Your name <span className="text-[#800020]">*</span>
                  </label>
                  <div className="relative group">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#800020] transition-colors" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                      placeholder="Esi Mensah"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2"
                  >
                    Email <span className="text-[#800020]">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#800020] transition-colors" />
                    <input
                      id="reg-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="you@studio.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2"
                  >
                    Password <span className="text-[#800020]">*</span>
                    <span className="text-stone-400 normal-case tracking-normal ml-1.5 font-normal">
                      · min 6 chars
                    </span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#800020] transition-colors" />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
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

                {/* Gender */}
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 mb-2"
                  >
                    Gender
                  </label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger
                      id="gender"
                      className="w-full h-12 bg-white border border-[#E7E5E4] rounded-xl text-sm text-[#1C1917] data-[placeholder]:text-stone-400 focus:outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/8 transition-all elevate-sm font-normal"
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#E7E5E4]">
                      <SelectItem value="Female" className="rounded-lg text-sm">
                        Female
                      </SelectItem>
                      <SelectItem value="Male" className="rounded-lg text-sm">
                        Male
                      </SelectItem>
                      <SelectItem value="Other" className="rounded-lg text-sm">
                        Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-stone-400 mt-1.5 leading-relaxed">
                    Used to address you as Madam / Master throughout the studio.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-[#800020] bg-[#800020]/5 border border-[#800020]/15 rounded-xl px-3.5 py-2.5 animate-fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#800020] mt-1.5 shrink-0" />
                    {error}
                  </div>
                )}

                <PremiumButton
                  type="submit"
                  size="lg"
                  loading={submitting}
                  className="w-full mt-1 group"
                >
                  {submitting ? (
                    "Creating your shop…"
                  ) : (
                    <>
                      Create shop
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                    </>
                  )}
                </PremiumButton>
              </form>

              {/* Back to sign in */}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="mt-6 w-full inline-flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-[#800020] transition-colors group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
                Already have a studio?
                <span className="font-semibold text-[#800020] underline-offset-4 group-hover:underline">
                  Back to sign in
                </span>
              </button>
            </div>
          )}

          {/* Subtle footer */}
          <p className="text-center text-[11px] text-stone-400 mt-8 leading-relaxed">
            Madam Studio — where every stitch tells a story.
          </p>
        </div>
      </div>
    </div>
  );
}
