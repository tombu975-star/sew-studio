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
  "h-11 w-full rounded-md border border-[#E7E5E4] bg-white px-3.5 text-sm text-[#1C1917] placeholder:text-stone-400 outline-none transition-colors focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15";

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
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] bg-[#faf8f5]">
      {/* Studio photograph — desktop only, so phones never download it */}
      <aside className="relative hidden lg:block bg-[#1C1917]">
        <Image
          src="/atelier-login.jpg"
          alt="A burgundy satin gown on a dress form in the atelier"
          fill
          sizes="50vw"
          quality={72}
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-[#1C1917]/70 px-12 py-8">
          <p className="font-display text-3xl font-semibold leading-tight text-white">
            Every stitch tells a story.
          </p>
          <p className="mt-2 text-sm text-white/70">Madam Studio · Bespoke atelier, Accra</p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col justify-center px-6 py-10 pt-safe pb-safe sm:px-12 lg:min-h-0">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#800020]">
              <Scissors className="size-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-display text-xl font-semibold text-[#1C1917]">Madam Studio</span>
          </div>

          {mode === "login" ? (
            <section key="login" className="animate-fade-in">
              <h1 className="font-display text-[34px] font-semibold leading-none text-[#1C1917]">Welcome back</h1>
              <p className="mt-2.5 text-sm text-stone-500">Sign in to your studio to continue.</p>

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

                <div className="flex items-center justify-between gap-4 text-xs">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-stone-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="size-4 accent-[#800020]"
                    />
                    Keep me signed in for 30 days
                  </label>
                  <a href="/forgot-password" className="font-medium text-[#800020] underline-offset-4 hover:underline">
                    Forgot password?
                  </a>
                </div>

                {error && <ErrorNote>{error}</ErrorNote>}

                <PremiumButton type="submit" size="lg" loading={submitting} className="w-full">
                  {submitting ? "Signing in…" : "Sign in"}
                </PremiumButton>
              </form>

              <p className="mt-8 border-t border-[#E7E5E4] pt-6 text-sm text-stone-500">
                Opening a new atelier?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-medium text-[#800020] underline-offset-4 hover:underline"
                >
                  Create a shop
                </button>
              </p>
            </section>
          ) : (
            <section key="register" className="animate-fade-in">
              <h1 className="font-display text-[34px] font-semibold leading-none text-[#1C1917]">Create your shop</h1>
              <p className="mt-2.5 text-sm text-stone-500">
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
                    <SelectTrigger id="gender" className="h-11 w-full rounded-md border-[#E7E5E4] bg-white text-sm font-normal text-[#1C1917] focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/15">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md border-[#E7E5E4]">
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

              <p className="mt-8 border-t border-[#E7E5E4] pt-6 text-sm text-stone-500">
                Already have a studio?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-[#800020] underline-offset-4 hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            </section>
          )}
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-[#1C1917]">
        {label}
        {required && <span className="ml-0.5 text-[#800020]" aria-hidden="true">*</span>}
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
    <p role="alert" className="rounded-md border border-[#800020]/20 bg-[#800020]/5 px-3.5 py-2.5 text-sm text-[#800020]">
      {children}
    </p>
  );
}
