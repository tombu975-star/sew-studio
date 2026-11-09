"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import { apiErrorMessage, apiGet, apiPatch } from "@/lib/api";

interface AdminSettings {
  appVersion: string;
  releaseNotes: string;
  brandName: string;
  loginHeading: string;
  loginDescription: string;
  loginFooter: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  updatedAt: string;
}

const EMPTY_SETTINGS: AdminSettings = {
  appVersion: "",
  releaseNotes: "",
  brandName: "",
  loginHeading: "",
  loginDescription: "",
  loginFooter: "",
  primaryColor: "#1D4ED8",
  accentColor: "#2563EB",
  backgroundColor: "#F4F6F8",
  updatedAt: "",
};

export function PlatformExperienceAdmin() {
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<AdminSettings>("/api/admin/platform-settings");
      setSettings(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load platform settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiGet("/api/admin-auth/me")
      .then(() => setAuthorized(true))
      .catch(() => setAuthorized(false))
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => { if (authorized) void load(); }, [authorized, load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await apiPatch<AdminSettings>("/api/admin/platform-settings", settings);
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save platform settings."));
    } finally {
      setSaving(false);
    }
  }

  if (checking || (authorized && loading)) {
    return <main className="grid min-h-dvh place-items-center bg-[#F6F7F9]"><Loader2 className="size-6 animate-spin text-[#416A59]" aria-label="Loading platform settings" /></main>;
  }
  if (!authorized) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#F6F7F9] px-5">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <ShieldCheck className="mx-auto size-8 text-[#416A59]" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Platform administrator sign-in required</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">Sign in at the admin portal, then return here to manage experience and release settings.</p>
          <a className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#315B4A] px-4 text-sm font-medium text-white hover:bg-[#244638]" href="/admin">Open admin portal</a>
        </section>
      </main>
    );
  }

  const textField = (key: keyof AdminSettings, label: string, hint: string, options?: { multiline?: boolean; maxLength?: number }) => (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {options?.multiline ? (
        <textarea value={String(settings[key])} maxLength={options.maxLength} rows={4} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#527564] focus:ring-4 focus:ring-[#527564]/10" />
      ) : (
        <input value={String(settings[key])} maxLength={options?.maxLength} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#527564] focus:ring-4 focus:ring-[#527564]/10" />
      )}
      <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">{hint}</span>
    </label>
  );

  return (
    <main className="min-h-dvh bg-[#F6F7F9] px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <a href="/admin" className="text-sm font-medium text-[#315B4A] hover:underline">← Back to platform admin</a>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#527564]">Platform operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Experience & releases</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Manage login-page messaging, the platform-wide color theme, and the version/release notes shown to users.</p></div>
          <span className="rounded-full border border-[#DDE8E0] bg-white px-3 py-1.5 text-xs text-slate-600">Admin-only controls</span>
        </div>

        {error && <div role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="size-4 shrink-0" />{error}</div>}
        {saved && <div role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="size-4" />Platform experience settings saved.</div>}

        <form onSubmit={save} className="mt-6 space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-semibold">Version & release notes</h2>
            <p className="mt-1 text-sm text-slate-500">Publish the version label and latest release summary shown on the login screen.</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {textField("appVersion", "Displayed version", "For example: 1.4.0. This is release metadata; deploying code remains controlled by your deployment pipeline.", { maxLength: 32 })}
              {textField("releaseNotes", "What’s new", "Short release notes visible on the sign-in screen (up to 2,000 characters).", { multiline: true, maxLength: 2000 })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-semibold">Login page content</h2>
            <p className="mt-1 text-sm text-slate-500">Customize the platform brand, welcome message and supporting copy.</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {textField("brandName", "Platform name", "Shown in the login header and browser title.", { maxLength: 80 })}
              {textField("loginHeading", "Welcome heading", "The main heading above the sign-in form.", { maxLength: 100 })}
              {textField("loginDescription", "Login description", "One sentence explaining what users can do after signing in.", { maxLength: 300 })}
              {textField("loginFooter", "Login footer", "Small footer line below the form.", { maxLength: 180 })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-semibold">Platform UI theme</h2>
            <p className="mt-1 text-sm text-slate-500">These colors update the app theme and login experience without changing studio-specific settings.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {([ ["primaryColor", "Primary color"], ["accentColor", "Accent color"], ["backgroundColor", "Page background"] ] as const).map(([key, label]) => (
                <label key={key} className="block text-sm font-medium text-slate-700">
                  {label}
                  <span className="mt-1.5 flex h-11 items-center gap-3 rounded-lg border border-slate-200 px-3">
                    <input type="color" value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value.toUpperCase() }))} className="size-7 cursor-pointer border-0 bg-transparent p-0" aria-label={label} />
                    <input value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value.toUpperCase() }))} pattern="^#[0-9A-Fa-f]{6}$" maxLength={7} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" aria-label={`${label} hex value`} />
                  </span>
                  <span className="mt-1 block text-xs font-normal text-slate-500">Choose a six-digit hex color.</span>
                </label>
              ))}
            </div>
            <div className="mt-5 rounded-xl p-4 text-white" style={{ background: `linear-gradient(120deg, ${settings.primaryColor}, ${settings.accentColor})` }}>
              <p className="text-xs font-medium text-white/80">Live preview</p><p className="mt-1 text-lg font-semibold">{settings.brandName || "Your platform"}</p><p className="mt-1 text-sm text-white/85">{settings.loginHeading || "Welcome back"}</p>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{settings.updatedAt ? `Last saved ${new Date(settings.updatedAt).toLocaleString()}` : "Changes take effect on the next app load."}</p>
            <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#315B4A] px-5 text-sm font-medium text-white transition hover:bg-[#244638] disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving…" : "Save platform settings"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
