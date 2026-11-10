"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Scissors, LogOut, Loader2, AlertCircle, CalendarDays, Banknote } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/atelier/_portal";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface FreelancerProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  specialty?: string | null;
  skills?: string | null;
}

interface FreelanceJob {
  id: string;
  taskDescription: string;
  cost?: number | null;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  shop?: { name: string };
}

const JOB_STATUSES = ["Commissioned", "In Progress", "Delivered", "Paid"] as const;

const STATUS_STYLE: Record<string, string> = {
  Commissioned: "bg-stone-100 text-stone-600 border-stone-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Delivered: "bg-sky-50 text-sky-700 border-sky-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function FreelancerPortalClient() {
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);

  useEffect(() => {
    apiGet<FreelancerProfile>("/api/freelancer-auth/me")
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (!profile) {
    return <FreelancerAuth onLoggedIn={setProfile} />;
  }

  return (
    <FreelancerDashboard profile={profile} onLogout={() => setProfile(null)} />
  );
}

/** Pull the server's friendly message out of the Error thrown by apiPost. */
function serverMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";
  const start = raw.indexOf("{");
  if (start >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(start));
      if (parsed?.error) return String(parsed.error);
    } catch {
      /* not JSON */
    }
  }
  return fallback;
}

const SPECIALTIES = ["Beader", "Embroiderer", "Cutter", "Tailor", "Designer", "Photographer", "Other"];

const INPUT_CLASS =
  "w-full h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]/50";

function FreelancerAuth({
  onLoggedIn,
}: {
  onLoggedIn: (p: FreelancerProfile) => void;
}) {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    params.get("mode") === "register" ? "register" : "login"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [skills, setSkills] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registering = mode === "register";

  function switchMode(m: "login" | "register") {
    setMode(m);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (registering) {
      if (!fullName.trim()) return setError("Please enter your name.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
    }
    setLoading(true);
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
          });
      onLoggedIn(res.freelancer);
    } catch (err) {
      setError(
        registering
          ? serverMessage(err, "Could not create your account. Please try again.")
          : "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F8FAFC] px-6 py-10 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white shadow-sm mb-4">
            <Scissors className="w-5 h-5" />
          </div>
          <h1 className="font-display font-semibold text-[#0F172A] text-2xl">
            {registering ? "Create your freelancer account" : "Freelancer sign in"}
          </h1>
          <p className="text-sm text-stone-500 mt-1 text-center">
            {registering
              ? "One account for every studio that commissions you."
              : "See the jobs shops have commissioned you for."}
          </p>
        </div>

        <SectionCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            {registering && (
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1 block">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={INPUT_CLASS}
                  autoComplete="name"
                  autoFocus
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="email"
                autoFocus={!registering}
              />
            </div>
            {registering && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-500 mb-1 block">
                      Phone <span className="text-stone-400">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 …"
                      className={INPUT_CLASS}
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-500 mb-1 block">
                      Specialty
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className={INPUT_CLASS}
                    >
                      <option value="">Select…</option>
                      {SPECIALTIES.map((sp) => (
                        <option key={sp} value={sp}>
                          {sp}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1 block">
                    Skills <span className="text-stone-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. hand beading, gele tying"
                    className={INPUT_CLASS}
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Password</label>
              <input
                type="password"
                required
                minLength={registering ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT_CLASS}
                autoComplete={registering ? "new-password" : "current-password"}
              />
              {registering && (
                <p className="text-[11px] text-stone-400 mt-1">At least 8 characters.</p>
              )}
            </div>
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading
                ? registering
                  ? "Creating account…"
                  : "Signing in…"
                : registering
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        </SectionCard>

        <p className="text-sm text-stone-500 text-center mt-6">
          {registering ? "Already have an account?" : "New freelancer?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(registering ? "login" : "register")}
            className="font-medium text-[#2563EB] underline-offset-4 hover:underline"
          >
            {registering ? "Sign in" : "Create an account"}
          </button>
        </p>
        <p className="text-xs text-stone-400 text-center mt-4">
          Your login works the same way across every shop that commissions
          you — one account, all your jobs.
        </p>
      </div>
    </div>
  );
}

function FreelancerDashboard({
  profile,
  onLogout,
}: {
  profile: FreelancerProfile;
  onLogout: () => void;
}) {
  const [jobs, setJobs] = useState<FreelanceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<FreelanceJob[]>("/api/freelancer/jobs")
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      const updated = await apiPatch<FreelanceJob>(
        `/api/freelancer/jobs/${id}`,
        { status }
      );
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    await apiPost("/api/freelancer-auth/logout", {});
    onLogout();
  }

  return (
    <div className="min-h-dvh bg-[#F8FAFC]">
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-2">
          <PageHeader
            eyebrow="Freelancer"
            title={`Hi, ${profile.fullName.split(" ")[0]}`}
            subtitle={
              profile.specialty
                ? `${profile.specialty} · your commissioned jobs across every shop`
                : "Your commissioned jobs across every shop"
            }
          />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#2563EB] transition-colors mt-1 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          </div>
        ) : jobs.length === 0 ? (
          <SectionCard>
            <div className="text-center py-8">
              <p className="text-sm text-stone-500">
                No jobs commissioned yet. Check back once a shop assigns you
                work.
              </p>
              <p className="text-xs text-stone-400 mt-3 max-w-xs mx-auto">
                New here? Give a studio the email you signed up with ({profile.email}) and
                they can add you from their Team page.
              </p>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <SectionCard key={j.id}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    {j.shop && (
                      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-400 mb-1">
                        {j.shop.name}
                      </p>
                    )}
                    <p className="font-medium text-[#0F172A] text-sm">
                      {j.taskDescription}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border ${
                      STATUS_STYLE[j.status] || STATUS_STYLE.Commissioned
                    }`}
                  >
                    {j.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mb-3">
                  {j.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" /> Due{" "}
                      {formatDate(j.dueDate)}
                    </span>
                  )}
                  {j.cost != null && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Banknote className="w-3.5 h-3.5" /> GHS {j.cost}
                    </span>
                  )}
                </div>

                <select
                  value={j.status}
                  onChange={(e) => handleStatusChange(j.id, e.target.value)}
                  disabled={updatingId === j.id}
                  className="h-9 px-2.5 rounded-md border border-[#E2E8F0] bg-white text-sm disabled:opacity-60"
                >
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
