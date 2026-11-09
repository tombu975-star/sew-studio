"use client";

import { useEffect, useState } from "react";
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
  "h-12 w-full rounded-md border border-[#E2E8F0] bg-white px-3.5 text-base sm:text-sm text-[#0F172A] placeholder:text-stone-400 outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

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
    <div className="min-h-dvh bg-[#F4F6F8]">
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pt-safe pb-safe sm:px-8">
        <div className="mx-auto w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#17263C]">
              <Scissors className="size-[18px] text-white" strokeWidth={2} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-[#17263C]">Madam Studio</span>
          </div>

          <div className="rounded-lg border border-[#D8DEE7] bg-white px-5 py-7 sm:px-9 sm:py-9">
          {mode === "login" ? (
            <section key="login" className="animate-fade-in">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[#17263C]">Sign in</h1>
              <p className="mt-2 text-sm text-slate-600">
                Sign in to manage your studio&apos;s customers, orders and daily work.
              </p>

              <form onSubmit={submitLogin} className="mt-8 space-y-5">
                <Field label="Email address" htmlFor="email">
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
                      className="size-4 shrink-0 accent-[#2563EB]"
                    />
                    Keep me signed in
                  </label>
                  <a href="/forgot-password" className="font-medium text-[#1D4ED8] underline-offset-4 hover:underline">
                    Forgot password?
                  </a>
                </div>

                {error && <ErrorNote>{error}</ErrorNote>}

                <PremiumButton type="submit" size="lg" loading={submitting} className="w-full">
                  {submitting ? "Signing in…" : "Sign in"}
                </PremiumButton>
              </form>

              <p className="mt-7 border-t border-[#E2E8F0] pt-6 text-sm leading-relaxed text-slate-600">
                New to Madam Studio? Create a shop account to set up your workspace.{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-medium text-[#1D4ED8] underline-offset-4 hover:underline"
                >
                  Create a shop account
                </button>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Work with studios as a freelancer?{" "}
                <a
                  href="/freelancer?mode=register"
                  className="font-medium text-[#1D4ED8] underline-offset-4 hover:underline"
                >
                  Create a freelancer account
                </a>
              </p>
            </section>
          ) : (
            <section key="register" className="animate-fade-in">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[#17263C]">Create your studio account</h1>
              <p className="mt-2 text-sm text-slate-600">
                Set up your studio account to start adding customers and orders.
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
                    <SelectTrigger id="gender" className="h-12 w-full rounded-md border-[#E2E8F0] bg-white text-base sm:text-sm font-normal text-[#0F172A] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md border-[#E2E8F0]">
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

              <p className="mt-7 border-t border-[#E2E8F0] pt-6 text-sm text-slate-600">
                Already have a studio?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-[#1D4ED8] underline-offset-4 hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            </section>
          )}
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Madam Studio · Atelier management system
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#0F172A]">
        {label}
        {required && <span className="ml-0.5 text-[#2563EB]" aria-hidden="true">*</span>}
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
    <p role="alert" className="rounded-md border border-[#2563EB]/20 bg-[#2563EB]/5 px-3.5 py-2.5 text-sm text-[#2563EB]">
      {children}
    </p>
  );
}
