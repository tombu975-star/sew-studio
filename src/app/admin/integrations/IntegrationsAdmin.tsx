"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, ShieldCheck, Trash2 } from "lucide-react";
import { api, apiErrorMessage, apiGet } from "@/lib/api";

type Source = "admin" | "environment" | "default" | "none";
interface SettingView {
  key: string; group: "email" | "notifications" | "ai"; kind: "text" | "url" | "number" | "bool" | "secret";
  label: string; help?: string; placeholder?: string; advanced: boolean;
  value: string; effective: string; source: Source; secretSet: boolean; secretHint: string; unreadable: boolean;
}
interface Loaded { settings: SettingView[]; appUrl: string; fallbackEncryptionKey: boolean; adminEmail: string }
type Target = "email" | "apps-script" | "anthropic" | "openai";

const input = "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10";
const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const ghostBtn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

const GROUPS: { id: SettingView["group"]; title: string; intro: string; tests: { target: Target; label: string }[] }[] = [
  { id: "email", title: "Email delivery", intro: "Password resets, Academy sign-in codes, freelancer verification and training sign-ups are sent with this. Resend is tried first, then SMTP, then the Apps Script.", tests: [{ target: "email", label: "Send test email" }] },
  { id: "notifications", title: "Customer notifications", intro: "Order updates to customers (WhatsApp, SMS, email) go through your Google Apps Script web app.", tests: [{ target: "apps-script", label: "Send test notification" }] },
  { id: "ai", title: "AI features", intro: "Style Assist concepts, concept sketches and Trend Insights.", tests: [{ target: "anthropic", label: "Check Anthropic key" }, { target: "openai", label: "Check OpenAI key" }] },
];

const SOURCE_LABEL: Record<Source, string> = { admin: "Set here", environment: "From server settings", default: "Default", none: "Not set" };
const SOURCE_STYLE: Record<Source, string> = {
  admin: "bg-emerald-50 text-emerald-700", environment: "bg-sky-50 text-sky-700", default: "bg-slate-100 text-slate-600", none: "bg-amber-50 text-amber-700",
};

export function IntegrationsAdmin() {
  const [data, setData] = useState<Loaded | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [clears, setClears] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState<Target | null>(null);
  const [results, setResults] = useState<Partial<Record<Target, { ok: boolean; message: string }>>>({});

  const load = useCallback(async () => {
    setError("");
    try { const d = await apiGet<Loaded>("/api/admin/integrations"); setData(d); setEdits({}); setClears(new Set()); }
    catch (err) { setError(apiErrorMessage(err, "Could not load integration settings.")); }
  }, []);

  useEffect(() => { apiGet("/api/admin-auth/me").then(() => setAuthorized(true)).catch(() => setAuthorized(false)).finally(() => setChecking(false)); }, []);
  useEffect(() => { if (authorized) void load(); }, [authorized, load]);

  const dirty = Object.keys(edits).length > 0 || clears.size > 0;
  const setEdit = (key: string, v: string) => { setSaved(false); setEdits((e) => ({ ...e, [key]: v })); setClears((c) => { const n = new Set(c); n.delete(key); return n; }); };
  const toggleClear = (key: string) => { setSaved(false); setClears((c) => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n; }); setEdits((e) => { const n = { ...e }; delete n[key]; return n; }); };

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const d = await api<Loaded>("/api/admin/integrations", { method: "PUT", body: JSON.stringify({ values: edits, clear: [...clears] }) });
      setData(d); setEdits({}); setClears(new Set()); setSaved(true);
    } catch (err) { setError(apiErrorMessage(err, "Could not save integration settings.")); }
    finally { setSaving(false); }
  }

  async function runTest(target: Target) {
    setTesting(target);
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/admin/integrations/test", { method: "POST", body: JSON.stringify({ target, to: testTo.trim() || undefined }) });
      setResults((x) => ({ ...x, [target]: r }));
    } catch (err) { setResults((x) => ({ ...x, [target]: { ok: false, message: apiErrorMessage(err, "The test could not run.") } })); }
    finally { setTesting(null); }
  }

  if (checking || (authorized && !data && !error)) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6]"><Loader2 className="size-6 animate-spin text-[#800020]" aria-label="Loading" /></main>;
  if (!authorized) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6] px-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><ShieldCheck className="mx-auto size-8 text-[#800020]" /><h1 className="mt-4 text-xl font-semibold">Platform administrator sign-in required</h1><a className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#800020] px-4 text-sm font-medium text-white" href="/admin">Open admin portal</a></section></main>;

  function renderField(s: SettingView) {
    const cleared = clears.has(s.key);
    const edited = edits[s.key];
    return (
      <div key={s.key}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`f-${s.key}`} className="text-sm font-medium text-slate-700">{s.label}</label>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_STYLE[cleared ? "none" : s.source]}`}>{cleared ? "Will be removed" : SOURCE_LABEL[s.source]}</span>
        </div>
        {s.kind === "bool" ? (
          <select id={`f-${s.key}`} className={input} value={edited ?? s.value} onChange={(e) => setEdit(s.key, e.target.value)}>
            <option value="">Automatic</option><option value="true">On</option><option value="false">Off</option>
          </select>
        ) : s.kind === "secret" ? (
          <input id={`f-${s.key}`} type="password" autoComplete="new-password" className={input} value={edited ?? ""} disabled={cleared}
            placeholder={s.secretSet ? `Saved ••••${s.secretHint}. Type to replace` : "Paste the key"} onChange={(e) => setEdit(s.key, e.target.value)} />
        ) : (
          <input id={`f-${s.key}`} className={input} value={edited ?? s.value} disabled={cleared}
            placeholder={s.effective && s.source !== "admin" ? s.effective : s.placeholder} onChange={(e) => setEdit(s.key, e.target.value)} />
        )}
        {s.unreadable && <p className="mt-1 text-xs text-amber-700">The saved value can no longer be decrypted (the encryption key changed). Enter it again.</p>}
        {s.help && <p className="mt-1 text-xs text-slate-500">{s.help}</p>}
        {(s.source === "admin" || s.unreadable) && <button type="button" onClick={() => toggleClear(s.key)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-red-700"><Trash2 className="size-3" />{cleared ? "Keep the saved value" : "Remove the value saved here (use the server setting instead)"}</button>}
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[#FAF6F6] px-4 py-8 text-slate-900 sm:px-8">
      <form onSubmit={save} className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-[#800020]">
          <a href="/admin" className="hover:underline">← Back to platform admin</a>
          <a href="/admin/website" className="hover:underline">Website content →</a>
        </div>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#85563A]">Platform</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Integrations and API keys</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Change email, notification and AI settings without redeploying. A value saved here wins over the server setting; remove it to fall back. Keys are stored encrypted and are never shown again.</p>
          {data && <p className="mt-2 text-sm text-slate-600">App address in use: <strong>{data.appUrl || "the address the site is opened from"}</strong>. Change it under <a className="font-medium text-[#800020] underline" href="/admin/website">Website content → Addresses and links</a>.</p>}
        </header>

        {data?.fallbackEncryptionKey && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">For stronger protection, add a <code className="rounded bg-amber-100 px-1">SETTINGS_ENCRYPTION_KEY</code> variable (any long random text) to the server. Until then keys are encrypted using the database address. Set it once and keep it: changing it later means keys must be entered again.</div>}
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mr-2 inline size-4" />{error}</div>}
        {saved && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline size-4" />Saved. New settings are used within a few seconds.</div>}

        <label className="block text-sm font-medium text-slate-700">Send test messages to
          <input className={input} type="email" value={testTo} placeholder={data?.adminEmail} onChange={(e) => setTestTo(e.target.value)} />
        </label>

        {data && GROUPS.map((g) => {
          const fields = data.settings.filter((s) => s.group === g.id);
          return (
            <section key={g.id} className={card}>
              <h2 className="text-lg font-semibold">{g.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{g.intro}</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">{fields.filter((f) => !f.advanced).map(renderField)}</div>
              {fields.some((f) => f.advanced) && (
                <details className="mt-5 rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Advanced: service addresses</summary>
                  <div className="mt-4 grid gap-5 md:grid-cols-2">{fields.filter((f) => f.advanced).map(renderField)}</div>
                </details>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                {g.tests.map((t) => (
                  <button key={t.target} type="button" disabled={testing !== null || dirty} onClick={() => void runTest(t.target)} className={ghostBtn}>
                    {testing === t.target && <Loader2 className="size-3.5 animate-spin" />}{t.label}
                  </button>
                ))}
                {dirty && <span className="text-xs text-slate-500">Save first, then test.</span>}
              </div>
              {g.tests.map((t) => results[t.target] && (
                <p key={t.target} role="status" className={`mt-3 text-sm ${results[t.target]!.ok ? "text-emerald-700" : "text-red-700"}`}>{results[t.target]!.message}</p>
              ))}
            </section>
          );
        })}

        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-slate-200 bg-[#FAF6F6]/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          {dirty && <button type="button" onClick={() => { setEdits({}); setClears(new Set()); }} className={ghostBtn}>Discard changes</button>}
          <button disabled={saving || !dirty} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#800020] px-5 text-sm font-medium text-white hover:bg-[#650019] disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </main>
  );
}
