"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail, Store, User as UserIcon, Users } from "lucide-react";
import { useAuth } from "@/stores/auth";
import { toast } from "sonner";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import { cn } from "@/lib/utils";
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
  "h-12 w-full rounded-xl border border-[#e7dfd8] bg-white px-4 text-base text-[#292321] outline-none transition placeholder:text-[#aa9e96] focus:border-[#8a3b50] focus:ring-4 focus:ring-[#8a3b50]/10 sm:h-[52px] sm:text-sm " +
  // phones: white pill with an icon on the left, as in the reference design
  "max-sm:rounded-full max-sm:border-0 max-sm:pl-12 max-sm:shadow-[0_6px_16px_rgba(60,8,18,0.22)] max-sm:placeholder:text-[#8a7a7d] max-sm:focus:ring-white/35";

const phoneButton =
  "max-sm:rounded-full max-sm:bg-white max-sm:text-[#a52b40] max-sm:shadow-[0_8px_20px_rgba(60,8,18,0.3)] max-sm:hover:bg-rose-50 max-sm:focus-visible:ring-white/60 max-sm:focus-visible:ring-offset-[#a52b40]";

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
    <>
      <PhoneTabs mode={mode} onSwitch={switchMode} />
      {mode === "login" ? (
        <section key="login" id="panel-login" role="tabpanel" aria-labelledby="tab-login" className="animate-fade-in">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a3b50] sm:block">
            Your studio, in good hands
          </p>
          <h2 className="font-serif text-[28px] font-medium tracking-tight text-[#302623] max-sm:sr-only sm:mt-3 sm:text-[42px]">
            Sign in
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-[#756a64] max-sm:hidden sm:mt-2 sm:text-sm sm:leading-6">
            Pick up where you left off. Your workroom is waiting.
          </p>

          <form onSubmit={submitLogin} className="mt-3 space-y-3 max-sm:space-y-3 [@media(max-height:700px)]:space-y-2.5 sm:mt-8 sm:space-y-5">
            <Field label="Email address" htmlFor="email" icon={Mail}>
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
                placeholder="Email address"
              />
            </Field>

            <Field label="Password" htmlFor="password" icon={Lock}>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                autoComplete="current-password"
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 pt-0.5 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#756a64] max-sm:text-white/90">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="size-4 shrink-0 accent-[#8a3b50] max-sm:accent-white"
                />
                Keep me signed in
              </label>
              <a
                href="/forgot-password"
                className="font-medium text-[#81384b] underline-offset-4 hover:underline max-sm:text-white"
              >
                Forgot password?
              </a>
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <PremiumButton
              type="submit"
              size="lg"
              loading={submitting}
              className={cn("h-12 w-full rounded-xl bg-[#782f43] text-white shadow-[0_8px_18px_rgba(120,47,67,0.2)] hover:bg-[#632638] sm:h-[52px]", phoneButton)}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </PremiumButton>
          </form>

          <div className="mt-4 border-t border-[#eee7e1] pt-4 max-sm:border-0 max-sm:pt-0 max-sm:text-center sm:mt-8 sm:pt-6">
              <p className="text-[13px] leading-5 text-[#756a64] max-sm:hidden sm:text-sm sm:leading-6">
                New to Madam Studio? Create a shop account to set up your workspace.
              </p>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="mt-2 text-sm font-semibold text-[#81384b] underline-offset-4 hover:underline max-sm:hidden"
            >
              Create a shop account <span aria-hidden="true">→</span>
            </button>
            <p className="mt-2.5 text-[13px] leading-5 text-[#756a64] max-sm:mt-0 max-sm:text-white/85 sm:mt-5 sm:text-sm sm:leading-6">
              Work with studios as a freelancer?{" "}
              <a
                href="/freelancer?mode=register"
                className="font-medium text-[#81384b] underline-offset-4 hover:underline max-sm:text-white max-sm:underline"
              >
                Create a freelancer account
              </a>
            </p>
          </div>
        </section>
      ) : (
        <section key="register" id="panel-register" role="tabpanel" aria-labelledby="tab-register" className="animate-fade-in">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a3b50] sm:block">
            Start creating
          </p>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-[#302623] max-sm:sr-only sm:mt-3 sm:text-4xl">
            Create your studio account
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-[#756a64] max-sm:hidden sm:mt-2 sm:text-sm sm:leading-6">
            Set up your studio account to start adding customers and orders.
          </p>

          <form onSubmit={submitRegister} className="mt-3 space-y-2.5 [@media(max-height:700px)]:space-y-2 sm:mt-8 sm:space-y-5">
            <Field label="Shop name" htmlFor="shopName" required icon={Store}>
              <input
                id="shopName"
                type="text"
                required
                autoComplete="organization"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className={inputClass}
                placeholder="Shop name"
              />
            </Field>

            <Field label="Your name" htmlFor="fullName" required icon={UserIcon}>
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
              />
            </Field>

            <Field label="Email" htmlFor="reg-email" required icon={Mail}>
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
                placeholder="Email address"
              />
            </Field>

            <Field label="Password" htmlFor="reg-password" required hint="At least 6 characters" icon={Lock}>
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
              icon={Users}
              hint="Used to address you as Madam / Master throughout the studio."
            >
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger
                  id="gender"
                  className="h-12 w-full rounded-xl border-[#e7dfd8] bg-white text-base font-normal data-[size=default]:h-12 sm:h-[52px] sm:data-[size=default]:h-[52px] text-[#292321] focus:border-[#8a3b50] focus:ring-4 focus:ring-[#8a3b50]/10 sm:text-sm max-sm:rounded-full max-sm:border-0 max-sm:pl-12 max-sm:shadow-[0_6px_16px_rgba(60,8,18,0.22)]"
                >
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#e7dfd8]">
                  <SelectItem value="Female" className="text-sm">Female</SelectItem>
                  <SelectItem value="Male" className="text-sm">Male</SelectItem>
                  <SelectItem value="Other" className="text-sm">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {error && <ErrorNote>{error}</ErrorNote>}

            <PremiumButton
              type="submit"
              size="lg"
              loading={submitting}
              className={cn("h-12 w-full rounded-xl bg-[#782f43] text-white shadow-[0_8px_18px_rgba(120,47,67,0.2)] hover:bg-[#632638] sm:h-[52px]", phoneButton)}
            >
              {submitting ? "Creating your shop…" : "Create shop"}
            </PremiumButton>
          </form>

          <p className="mt-4 border-t border-[#eee7e1] pt-4 text-sm text-[#756a64] max-sm:hidden sm:mt-7 sm:pt-6">
            Already have a studio?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-medium text-[#81384b] underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          </p>
        </section>
      )}
    </>
  );
}

/* ---------- small pieces ---------- */

function Field({
  label,
  htmlFor,
  required,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* On phones the placeholder and icon carry the label; screen readers still get it */}
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-[#403632] max-sm:sr-only sm:mb-2">
        {label}
        {required && <span className="ml-0.5 text-[#8a3b50]" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 z-10 hidden size-[18px] -translate-y-1/2 text-[#a52b40] max-sm:block" />
        )}
        {children}
      </div>
      {hint && <p className="mt-1.5 hidden text-xs leading-relaxed text-stone-400 sm:block">{hint}</p>}
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
        placeholder="Password"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#9b8e86] transition-colors hover:bg-[#f7f2ee] hover:text-[#5d4c46] max-sm:rounded-full max-sm:text-[#8a7a7d]"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-[#a3333d]/20 bg-[#a3333d]/5 px-3.5 py-2.5 text-sm text-[#8f2933] max-sm:rounded-2xl max-sm:border-0 max-sm:bg-white max-sm:py-2 max-sm:text-[13px]">
      {children}
    </p>
  );
}

/** Sign in / Sign up tabs shown on phones only (desktop keeps its headings and links). */
function PhoneTabs({ mode, onSwitch }: { mode: Mode; onSwitch: (m: Mode) => void }) {
  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      id={`tab-${m}`}
      aria-selected={mode === m}
      aria-controls={`panel-${m}`}
      onClick={() => onSwitch(m)}
      className={cn(
        "relative pb-1.5 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#a52b40]",
        mode === m ? "font-semibold text-white" : "font-medium text-white/65"
      )}
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-white transition-opacity",
          mode === m ? "opacity-100" : "opacity-0"
        )}
      />
    </button>
  );
  return (
    <div role="tablist" aria-label="Account" className="mb-3.5 mt-1 flex items-end justify-between px-1 sm:hidden">
      {tab("login", "Sign in")}
      {tab("register", "Sign up")}
    </div>
  );
}
