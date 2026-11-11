"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RotateCcw, Save, ShieldCheck, Rocket } from "lucide-react";
import { apiErrorMessage, apiGet, apiPatch, apiPost } from "@/lib/api";

type AdminSettings = {
  appVersion: string; releaseNotes: string; brandName: string; loginHeading: string;
  loginDescription: string; loginFooter: string; primaryColor: string; accentColor: string;
  backgroundColor: string; updatedAt: string;
};
type Release = { id: string; version: string; releaseNotes: string; status: "draft" | "published" | "archived"; createdAt: string; publishedAt?: string | null };
type AuditEntry = { id: string; action: string; entity: string; details: Record<string, unknown>; createdAt: string; adminEmail?: string; adminName?: string };
const EMPTY: AdminSettings = { appVersion: "", releaseNotes: "", brandName: "", loginHeading: "", loginDescription: "", loginFooter: "", primaryColor: "#571A84", accentColor: "#6A1FA0", backgroundColor: "#F6F2F9", updatedAt: "" };
const inputClass = "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#527564] focus:ring-4 focus:ring-[#527564]/10";

export function PlatformExperienceAdmin() {
  const [settings, setSettings] = useState(EMPTY);
  const [releases, setReleases] = useState<Release[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [releaseError, setReleaseError] = useState("");
  const [workingReleaseId, setWorkingReleaseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [current, releaseHistory, auditHistory] = await Promise.all([
        apiGet<AdminSettings>("/api/admin/platform-settings"),
        apiGet<Release[]>("/api/admin/releases"),
        apiGet<AuditEntry[]>("/api/admin/audit-log"),
      ]);
      setSettings(current);
      setReleases(releaseHistory);
      setAudit(auditHistory);
      setVersion(current.appVersion);
      setReleaseNotes(current.releaseNotes);
    } catch (err) { setError(apiErrorMessage(err, "Could not load platform controls.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    apiGet("/api/admin-auth/me").then(() => setAuthorized(true)).catch(() => setAuthorized(false)).finally(() => setChecking(false));
  }, []);
  useEffect(() => { if (authorized) void load(); }, [authorized, load]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const updated = await apiPatch<AdminSettings>("/api/admin/platform-settings", settings);
      setSettings(updated); setSaved(true); await load();
    } catch (err) { setError(apiErrorMessage(err, "Could not save platform settings.")); }
    finally { setSaving(false); }
  }

  async function createDraft(event: React.FormEvent) {
    event.preventDefault(); setReleaseSaving(true); setReleaseError("");
    try {
      await apiPost<Release>("/api/admin/releases", { version, releaseNotes });
      await load();
    } catch (err) { setReleaseError(apiErrorMessage(err, "Could not create release draft.")); }
    finally { setReleaseSaving(false); }
  }

  async function releaseAction(id: string, action: "publish" | "rollback") {
    setWorkingReleaseId(id); setReleaseError("");
    try {
      await apiPost(`/api/admin/releases/${id}/${action}`, {});
      await load();
      setSaved(action === "publish");
    } catch (err) { setReleaseError(apiErrorMessage(err, `Could not ${action} release.`)); }
    finally { setWorkingReleaseId(null); }
  }

  if (checking || (authorized && loading)) return <main className="grid min-h-dvh place-items-center bg-[#F7F4FA]"><Loader2 className="size-6 animate-spin text-[#416A59]" aria-label="Loading platform controls" /></main>;
  if (!authorized) return <main className="grid min-h-dvh place-items-center bg-[#F7F4FA] px-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><ShieldCheck className="mx-auto size-8 text-[#416A59]" /><h1 className="mt-4 text-xl font-semibold">Platform administrator sign-in required</h1><p className="mt-2 text-sm text-slate-500">Sign in at the admin portal, then return to manage releases and experience settings.</p><a className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#315B4A] px-4 text-sm font-medium text-white" href="/admin">Open admin portal</a></section></main>;

  const textField = (key: keyof AdminSettings, label: string, hint: string, multiline = false, maxLength?: number) => (
    <label className="block text-sm font-medium text-slate-700">{label}
      {multiline ? <textarea value={settings[key]} maxLength={maxLength} rows={4} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#527564] focus:ring-4 focus:ring-[#527564]/10" /> : <input value={settings[key]} maxLength={maxLength} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} className={inputClass} />}
      <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>
    </label>
  );

  return (
    <main className="min-h-dvh bg-[#F7F4FA] px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <a href="/admin" className="text-sm font-medium text-[#315B4A] hover:underline">← Back to platform admin</a>
        <header className="mt-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#527564]">Platform operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Experience, releases & audit</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Manage platform presentation, prepare release snapshots, publish or restore a previous configuration, and review administrator changes. Code deployments remain controlled by your deployment pipeline.</p></header>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mr-2 inline size-4" />{error}</div>}
        {saved && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline size-4" />Changes published and applied.</div>}

        <form onSubmit={saveSettings} className="mt-6 space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold">Experience & login branding</h2><p className="mt-1 text-sm text-slate-500">These are live settings; save to apply immediately. Create a release draft below to preserve a restorable snapshot.</p><div className="mt-5 grid gap-5 md:grid-cols-2">{textField("brandName", "Platform name", "Login header and browser title.", false, 80)}{textField("loginHeading", "Welcome heading", "Login page headline.", false, 100)}{textField("loginDescription", "Login description", "Supporting copy on the login screen.", false, 300)}{textField("loginFooter", "Login footer", "Footer line below the form.", false, 180)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-lg font-semibold">Platform UI theme</h2><p className="mt-1 text-sm text-slate-500">Global colors used by the app theme and login experience.</p><div className="mt-5 grid gap-5 sm:grid-cols-3">{([ ["primaryColor", "Primary color"], ["accentColor", "Accent color"], ["backgroundColor", "Page background"] ] as const).map(([key, label]) => <label key={key} className="block text-sm font-medium text-slate-700">{label}<span className="mt-1.5 flex h-11 items-center gap-3 rounded-lg border border-slate-200 px-3"><input type="color" value={settings[key]} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value.toUpperCase() }))} className="size-7 cursor-pointer border-0 bg-transparent p-0" aria-label={label} /><input value={settings[key]} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value.toUpperCase() }))} pattern="^#[0-9A-Fa-f]{6}$" maxLength={7} className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" aria-label={`${label} hex value`} /></span></label>)}</div><div className="mt-5 rounded-xl p-4 text-white" style={{ background: `linear-gradient(120deg, ${settings.primaryColor}, ${settings.accentColor})` }}><p className="text-xs text-white/80">Live preview</p><p className="mt-1 text-lg font-semibold">{settings.brandName || "Your platform"}</p><p className="mt-1 text-sm">{settings.loginHeading || "Welcome back"}</p></div></section>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{settings.updatedAt ? `Last saved ${new Date(settings.updatedAt).toLocaleString()}` : ""}</p><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#315B4A] px-5 text-sm font-medium text-white hover:bg-[#244638] disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving…" : "Save live settings"}</button></div>
        </form>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EEF4F0] text-[#315B4A]"><Rocket className="size-5" /></span><div><h2 className="text-lg font-semibold">Release snapshots</h2><p className="mt-1 text-sm text-slate-500">Create a versioned snapshot of saved experience settings. Publishing applies the snapshot; rollback restores a previous snapshot. This does not deploy or revert application code.</p></div></div>{releaseError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{releaseError}</p>}
          <form onSubmit={createDraft} className="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"><label className="text-sm font-medium">Version<input required maxLength={32} value={version} onChange={(e) => setVersion(e.target.value)} className={inputClass} placeholder="1.1.0" /></label><label className="text-sm font-medium">Release notes<textarea maxLength={2000} rows={2} value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" placeholder="Summarize what this release changes" /></label><button disabled={releaseSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#315B4A] px-4 text-sm font-medium text-[#315B4A] disabled:opacity-50">{releaseSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save draft</button></form>
          <div className="mt-6 divide-y divide-slate-100">{releases.length === 0 ? <p className="py-6 text-sm text-slate-500">No release snapshots yet. Save settings, then create a draft.</p> : releases.map((release) => <div key={release.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{release.version}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${release.status === "published" ? "bg-emerald-50 text-emerald-700" : release.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{release.status}</span></div>{release.releaseNotes && <p className="mt-1 text-sm text-slate-500">{release.releaseNotes}</p>}<p className="mt-1 text-xs text-slate-400">Created {new Date(release.createdAt).toLocaleString()}{release.publishedAt ? ` · Published ${new Date(release.publishedAt).toLocaleString()}` : ""}</p></div><div className="flex gap-2">{release.status === "draft" && <button onClick={() => void releaseAction(release.id, "publish")} disabled={workingReleaseId === release.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#315B4A] px-3 text-xs font-medium text-white disabled:opacity-50">{workingReleaseId === release.id ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3.5" />}Publish</button>}{release.status !== "published" && <button onClick={() => void releaseAction(release.id, "rollback")} disabled={workingReleaseId === release.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 disabled:opacity-50"><RotateCcw className="size-3.5" />Restore</button>}</div></div>)}</div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-2"><Clock3 className="size-5 text-[#527564]" /><h2 className="text-lg font-semibold">Administrator audit log</h2></div><p className="mt-1 text-sm text-slate-500">Recent settings and release actions. Most recent 100 changes are retained.</p><div className="mt-4 divide-y divide-slate-100">{audit.length === 0 ? <p className="py-5 text-sm text-slate-500">No admin actions recorded yet.</p> : audit.map((entry) => <div key={entry.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-slate-800">{entry.action.replaceAll(".", " ")}</p><time className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</time></div><p className="mt-1 text-xs text-slate-500">{entry.adminName || entry.adminEmail || "Platform admin"}{typeof entry.details.version === "string" ? ` · Version ${entry.details.version}` : ""}{typeof entry.details.restoredVersion === "string" ? ` · Restored ${entry.details.restoredVersion}` : ""}</p></div>)}</div></section>
      </div>
    </main>
  );
}
