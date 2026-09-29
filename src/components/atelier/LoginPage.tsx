"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Scissors, Eye, EyeOff } from "lucide-react";
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
  "h-12 w-full rounded-md border border-[#EAE6DF] bg-white px-3.5 text-base sm:text-sm text-[#1C1A18] placeholder:text-stone-400 outline-none transition-colors focus:border-[#9E5A44] focus:ring-2 focus:ring-[#9E5A44]/15";

export function LoginPage() {
  const { login, register, hydrate, status } = useAuth();
  const [mode, setMode] = useState<Mode>("login");

  // shared / login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
      const user = await login(email, password, rememberMe);
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
    <div className="relative min-h-dvh bg-[#1C1A18] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:bg-[#FAFAF7]">
      {/* Studio photograph — full-bleed behind the form on phones, left half on desktop */}
      <aside className="fixed inset-0 bg-[#1C1A18] lg:relative lg:inset-auto">
        <Image
          src="/atelier-login.jpg"
          alt="A burgundy satin gown on a dress form in the atelier"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={72}
          className="object-cover"
        />
        {/* Mobile scrim so the floating card and brand stay legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/65 lg:hidden" />
        <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-[#1C1A18]/85 via-[#1C1A18]/45 to-transparent px-12 pb-10 pt-28 lg:block">
          <p className="font-display text-3xl font-semibold leading-tight text-white">
            Every stitch tells a story.
          </p>
          <p className="mt-2 text-sm text-white/70">Madam Studio · Bespoke atelier, Accra</p>
        </div>
      </aside>

      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-8 pt-safe pb-safe sm:px-8 sm:py-12 lg:min-h-0 lg:items-stretch lg:bg-[#FAFAF7] lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-center gap-3 lg:mb-7 lg:justify-start">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[linear-gradient(155deg,#C4927A_0%,#9E5A44_55%,#6B3A27_100%)] shadow-[0_8px_20px_-8px_rgba(158,90,68,0.5)]">
              <Scissors className="size-[18px] text-white" strokeWidth={2} />
            </div>
            <span className="font-display text-xl font-semibold text-white drop-shadow-sm lg:text-[#1C1A18] lg:drop-shadow-none">Madam Studio</span>
          </div>

          <div className="rounded-2xl border border-white/30 bg-white/95 px-5 py-7 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-9 sm:py-10 lg:border-[#EAE6DF] lg:bg-white lg:shadow-[0_1px_2px_rgba(28,25,23,0.04),0_16px_40px_-16px_rgba(28,25,23,0.12)] lg:backdrop-blur-none">
          {mode === "login" ? (
            <section key="login" className="animate-fade-in">
              <h1 className="font-display text-[28px] sm:text-[32px] font-semibold leading-tight text-[#1C1A18] text-center lg:text-left">Welcome back</h1>
              <p className="mt-2 text-sm text-stone-500 text-center lg:text-left">Sign in to your studio to continue.</p>

              <form onSubmit={submitLogin} className="mt-8 space-y-5">
                <Field label="Email" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@studio.com"
                  />
                </Field>

                <Field label="Password" htmlFor="password">
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    autoComplete="current-password"
                  />
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 text-xs pt-0.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-stone-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="size-4 shrink-0 accent-[#9E5A44]"
                    />
                    Keep me signed in
                  </label>
                  <a href="/forgot-password" className="font-medium text-[#9E5A44] underline-offset-4 hover:underline">
                    Forgot password?
                  </a>
                </div>

                {error && <ErrorNote>{error}</ErrorNote>}

                <PremiumButton type="submit" size="lg" loading={submitting} className="w-full">
                  {submitting ? "Signing in…" : "Sign in"}
                </PremiumButton>
              </form>

              <p className="mt-7 border-t border-[#EAE6DF] pt-6 text-center text-sm text-stone-500 lg:text-left">
                Opening a new atelier?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-medium text-[#9E5A44] underline-offset-4 hover:underline"
                >
                  Create a shop
                </button>
              </p>
            </section>
          ) : (
            <section key="register" className="animate-fade-in">
              <h1 className="font-display text-[28px] sm:text-[32px] font-semibold leading-tight text-[#1C1A18] text-center lg:text-left">Create your shop</h1>
              <p className="mt-2 text-sm text-stone-500 text-center lg:text-left">
                Open a new atelier — your studio, your clients, your craft.
              </p>

              <form onSubmit={submitRegister} className="mt-8 space-y-5">
                <Field label="Shop name" htmlFor="shopName" required>
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
                </Field>

                <Field label="Your name" htmlFor="fullName" required>
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
                </Field>

                <Field label="Email" htmlFor="reg-email" required>
                  <input
                    id="reg-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@studio.com"
                  />
                </Field>

                <Field label="Password" htmlFor="reg-password" required hint="At least 6 characters">
                  <PasswordInput
                    id="reg-password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    autoComplete="new-password"
                    minLength={6}
                  />
                </Field>

                <Field
                  label="Gender"
                  htmlFor="gender"
                  hint="Used to address you as Madam / Master throughout the studio."
                >
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender" className="h-12 w-full rounded-md border-[#EAE6DF] bg-white text-base sm:text-sm font-normal text-[#1C1A18] focus:border-[#9E5A44] focus:ring-2 focus:ring-[#9E5A44]/15">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md border-[#EAE6DF]">
                      <SelectItem value="Female" className="text-sm">Female</SelectItem>
                      <SelectItem value="Male" className="text-sm">Male</SelectItem>
                      <SelectItem value="Other" className="text-sm">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {error && <ErrorNote>{error}</ErrorNote>}

                <PremiumButton type="submit" size="lg" loading={submitting} className="w-full">
                  {submitting ? "Creating your shop…" : "Create shop"}
                </PremiumButton>
              </form>

              <p className="mt-7 border-t border-[#EAE6DF] pt-6 text-center text-sm text-stone-500 lg:text-left">
                Already have a studio?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-[#9E5A44] underline-offset-4 hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            </section>
          )}
          </div>

          <p className="mt-6 text-center text-[11px] text-white/70 lg:text-left lg:text-stone-400">
            Madam Studio — where every stitch tells a story.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ---------- small pieces ---------- */

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#1C1A18]">
        {label}
        {required && <span className="ml-0.5 text-[#9E5A44]" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-stone-400">{hint}</p>}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass + " pr-11"}
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-stone-400 transition-colors hover:text-stone-700"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-[#9E5A44]/20 bg-[#9E5A44]/5 px-3.5 py-2.5 text-sm text-[#9E5A44]">
      {children}
    </p>
  );
}
