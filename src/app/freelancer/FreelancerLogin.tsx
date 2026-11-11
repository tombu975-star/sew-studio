"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, Lock, Mail, Phone, Sparkles, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { PlatformLogin } from "@/components/atelier/PlatformLogin";
import { PremiumButton } from "@/components/atelier/PremiumButton";
import {
  ErrorNote,
  Field,
  PasswordInput,
  PhoneTabs,
  extractApiError,
  inputClass,
  phoneButton,
} from "@/components/atelier/LoginPage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FreelancerProfile } from "./types";

const SPECIALTIES = ["Beader", "Embroiderer", "Cutter", "Tailor", "Designer", "Photographer", "Other"];

/**
 * Freelancer sign-in / sign-up. Same split layout, photo, typography and form
 * pieces as the studio sign-in (PlatformLogin + LoginPage), with freelancer copy.
 */
export function FreelancerLogin({ onLoggedIn }: { onLoggedIn: (p: FreelancerProfile) => void }) {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [skills, setSkills] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const registering = mode === "register";
  const switchMode = (m: "login" | "register") => {
    setMode(m);
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (registering) {
      if (!fullName.trim()) return setError("Please enter your name.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
    }
    setSubmitting(true);
    try {
      const res = registering
        ? await apiPost<{ freelancer: FreelancerProfile }>("/api/freelancer-auth/register", {
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            phone: phone.trim() || undefined,
            specialty: specialty || undefined,
            skills: skills.trim() || undefined,
          })
        : await apiPost<{ freelancer: FreelancerProfile }>("/api/freelancer-auth/login", {
            email,
            password,
            rememberMe,
          });
      toast.success(
        registering
          ? "Welcome aboard! Check your email to verify your account and get your badge."
          : `Welcome back, ${res.freelancer.fullName.split(" ")[0]}.`
      );
      onLoggedIn(res.freelancer);
    } catch (err) {
      const msg = registering
        ? extractApiError(err, "Could not create your account. Please try again.")
        : extractApiError(err, "Could not sign in.");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitClass = cn(
    "h-12 w-full rounded-xl bg-[#6A1FA0] text-white shadow-[0_8px_18px_rgba(106,31,160,0.2)] hover:bg-[#571A84] sm:h-[52px]",
    phoneButton
  );

  return (
    <PlatformLogin
      subtitle="Freelancer portal"
      eyebrow="Made for makers"
      heading="Good work finds you here."
      description="One account for every studio that commissions you. Pick up open jobs, track your commissions and get paid for the craft you love."
      tagline="Built for beaders, tailors, embroiderers and every hand behind the garment"
    >
      <PhoneTabs mode={mode} onSwitch={switchMode} />
      <section key={mode} id={`panel-${mode}`} role="tabpanel" aria-labelledby={`tab-${mode}`} className="animate-fade-in">
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6A1FA0] sm:block">
          {registering ? "Join the network" : "Freelancer portal"}
        </p>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-[#1F1430] max-sm:sr-only sm:mt-3 sm:text-4xl">
          {registering ? "Create your freelancer account" : "Sign in"}
        </h2>
        <p className="mt-1 text-[13px] leading-5 text-[#6B6178] max-sm:hidden sm:mt-2 sm:text-sm sm:leading-6">
          {registering
            ? "Studios can find you, and you can apply for the jobs they post."
            : "See your commissions and the jobs studios have posted."}
        </p>

        <form onSubmit={submit} className="mt-3 space-y-3 [@media(max-height:700px)]:space-y-2.5 sm:mt-8 sm:space-y-5">
          {registering && (
            <Field label="Full name" htmlFor="fl-name" required icon={UserIcon}>
              <input id="fl-name" type="text" required autoComplete="name" value={fullName}
                onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Full name" />
            </Field>
          )}
          <Field label="Email address" htmlFor="fl-email" required={registering} icon={Mail}>
            <input id="fl-email" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} required
              autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className={inputClass} placeholder="Email address" />
          </Field>
          {registering && (
            <>
              <Field label="Phone" htmlFor="fl-phone" icon={Phone} hint="Optional. Studios only see it after you work together.">
                <input id="fl-phone" type="tel" autoComplete="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="Phone (optional)" />
              </Field>
              <Field label="Specialty" htmlFor="fl-specialty" icon={Briefcase}>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger
                    id="fl-specialty"
                    className="h-12 w-full rounded-xl border-[#E5DEEC] bg-white text-base font-normal data-[size=default]:h-12 sm:h-[52px] sm:data-[size=default]:h-[52px] text-[#1F1430] focus:border-[#6A1FA0] focus:ring-4 focus:ring-[#6A1FA0]/10 sm:text-sm max-sm:rounded-full max-sm:border-0 max-sm:pl-12 max-sm:shadow-[0_6px_16px_rgba(30,8,60,0.22)]"
                  >
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E5DEEC]">
                    {SPECIALTIES.map((sp) => (
                      <SelectItem key={sp} value={sp} className="text-sm">{sp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Skills" htmlFor="fl-skills" icon={Sparkles} hint="Shown to studios searching for talent.">
                <input id="fl-skills" type="text" value={skills} onChange={(e) => setSkills(e.target.value)}
                  className={inputClass} placeholder="Skills, e.g. hand beading, gele tying" />
              </Field>
            </>
          )}
          <Field label="Password" htmlFor="fl-password" required={registering} hint={registering ? "At least 8 characters" : undefined} icon={Lock}>
            <PasswordInput
              id="fl-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              autoComplete={registering ? "new-password" : "current-password"}
              minLength={registering ? 8 : undefined}
            />
          </Field>

          {!registering && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 pt-0.5 text-xs">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[#6B6178] max-sm:text-white/90">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 shrink-0 accent-[#6A1FA0] max-sm:accent-white" />
                Keep me signed in
              </label>
              <a href="/forgot-password" className="font-medium text-[#6A1FA0] underline-offset-4 hover:underline max-sm:text-white">
                Forgot password?
              </a>
            </div>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}

          <PremiumButton type="submit" size="lg" loading={submitting} className={submitClass}>
            {submitting ? (registering ? "Creating your account…" : "Signing in…") : registering ? "Create account" : "Sign in"}
          </PremiumButton>
        </form>

        <div className="mt-4 border-t border-[#EDE7F3] pt-4 max-sm:border-0 max-sm:pt-0 max-sm:text-center sm:mt-8 sm:pt-6">
          <p className="text-[13px] leading-5 text-[#6B6178] max-sm:hidden sm:text-sm sm:leading-6">
            {registering ? "Already have an account?" : "New freelancer?"}{" "}
            <button type="button" onClick={() => switchMode(registering ? "login" : "register")}
              className="font-semibold text-[#6A1FA0] underline-offset-4 hover:underline">
              {registering ? "Back to sign in" : "Create an account"} <span aria-hidden="true">→</span>
            </button>
          </p>
          <p className="mt-2.5 text-[13px] leading-5 text-[#6B6178] max-sm:mt-0 max-sm:text-white/85 sm:mt-5 sm:text-sm sm:leading-6">
            Running a studio?{" "}
            <a href="/" className="font-medium text-[#6A1FA0] underline-offset-4 hover:underline max-sm:text-white max-sm:underline">
              Studio sign in
            </a>
          </p>
        </div>
      </section>
    </PlatformLogin>
  );
}
