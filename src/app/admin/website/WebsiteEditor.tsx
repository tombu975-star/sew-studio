"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Plus, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { api, apiErrorMessage, apiGet } from "@/lib/api";
import { DEFAULT_WEBSITE_CONTENT, FEATURE_ICONS, type WebsiteContent } from "@/lib/website-content";

type Loaded = { content: WebsiteContent; updatedAt: string | null };

const input = "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#9A6A42] focus:ring-4 focus:ring-[#9A6A42]/10";
const area = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#9A6A42] focus:ring-4 focus:ring-[#9A6A42]/10";
const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const ghostBtn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50";

function Field({ label, value, onChange, max, multiline }: { label: string; value: string; onChange: (v: string) => void; max: number; multiline?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {multiline
        ? <textarea rows={3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={area} />
        : <input maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} className={input} />}
    </label>
  );
}

export function WebsiteEditor() {
  const [content, setContent] = useState<WebsiteContent>(DEFAULT_WEBSITE_CONTENT);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await apiGet<Loaded>("/api/admin/website-content");
      setContent(data.content); setUpdatedAt(data.updatedAt);
    } catch (err) { setError(apiErrorMessage(err, "Could not load website content.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    apiGet("/api/admin-auth/me").then(() => setAuthorized(true)).catch(() => setAuthorized(false)).finally(() => setChecking(false));
  }, []);
  useEffect(() => { if (authorized) void load(); }, [authorized, load]);

  const set = <K extends keyof WebsiteContent>(key: K, patch: Partial<WebsiteContent[K]>) => {
    setSaved(false);
    setContent((c) => ({ ...c, [key]: { ...c[key], ...patch } }));
  };

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const data = await api<Loaded>("/api/admin/website-content", { method: "PUT", body: JSON.stringify(content) });
      setContent(data.content); setUpdatedAt(data.updatedAt); setSaved(true);
    } catch (err) { setError(apiErrorMessage(err, "Could not save website content.")); }
    finally { setSaving(false); }
  }

  async function reset() {
    if (!window.confirm("Restore all website text to the original defaults? Your edits will be lost.")) return;
    setSaving(true); setError(""); setSaved(false);
    try { await api("/api/admin/website-content", { method: "DELETE" }); await load(); setSaved(true); }
    catch (err) { setError(apiErrorMessage(err, "Could not reset website content.")); }
    finally { setSaving(false); }
  }

  if (checking || (authorized && loading)) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6]"><Loader2 className="size-6 animate-spin text-[#782F43]" aria-label="Loading" /></main>;
  if (!authorized) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6] px-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><ShieldCheck className="mx-auto size-8 text-[#782F43]" /><h1 className="mt-4 text-xl font-semibold">Platform administrator sign-in required</h1><p className="mt-2 text-sm text-slate-500">Sign in at the admin portal, then return to edit the website.</p><a className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#782F43] px-4 text-sm font-medium text-white" href="/admin">Open admin portal</a></section></main>;

  return (
    <main className="min-h-dvh bg-[#FAF6F6] px-4 py-8 text-slate-900 sm:px-8">
      <form onSubmit={save} className="mx-auto max-w-4xl space-y-5">
        <a href="/admin" className="text-sm font-medium text-[#782F43] hover:underline">← Back to platform admin</a>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#85563A]">Public website</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Website content</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Edit the text, portals, features and questions shown on the public home page. Changes go live as soon as you save.</p>
          <a href="/" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#782F43] hover:underline">View website <ExternalLink className="size-3.5" /></a>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mr-2 inline size-4" />{error}</div>}
        {saved && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline size-4" />Saved. The website is updated.</div>}

        <section className={card}>
          <h2 className="text-lg font-semibold">Hero</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Small label above headline" value={content.hero.eyebrow} max={60} onChange={(v) => set("hero", { eyebrow: v })} />
            <Field label="Headline" value={content.hero.headline} max={120} onChange={(v) => set("hero", { headline: v })} />
            <div className="md:col-span-2"><Field label="Supporting text" multiline value={content.hero.subheadline} max={300} onChange={(v) => set("hero", { subheadline: v })} /></div>
            <Field label="Main button" value={content.hero.primaryCta} max={40} onChange={(v) => set("hero", { primaryCta: v })} />
            <Field label="Second button" value={content.hero.secondaryCta} max={40} onChange={(v) => set("hero", { secondaryCta: v })} />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Portals</h2>
          <p className="mt-1 text-sm text-slate-500">Turn a portal card off to hide it from the website. The portal itself keeps working.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Section heading" value={content.portals.heading} max={100} onChange={(v) => set("portals", { heading: v })} />
            <Field label="Section intro" value={content.portals.intro} max={240} onChange={(v) => set("portals", { intro: v })} />
          </div>
          <div className="mt-6 space-y-4">
            {content.portals.items.map((p, i) => {
              const update = (patch: Partial<typeof p>) => set("portals", { items: content.portals.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold capitalize">
                    <input type="checkbox" checked={p.enabled} onChange={(e) => update({ enabled: e.target.checked })} className="size-4 accent-[#782F43]" />
                    {p.id} portal card {p.enabled ? "" : "(hidden)"}
                  </label>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Name" value={p.name} max={40} onChange={(v) => update({ name: v })} />
                    <Field label="Who it is for" value={p.audience} max={80} onChange={(v) => update({ audience: v })} />
                    <Field label="Button text" value={p.cta} max={40} onChange={(v) => update({ cta: v })} />
                    <div className="md:col-span-3"><Field label="Description" multiline value={p.blurb} max={240} onChange={(v) => update({ blurb: v })} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Features</h2>
          <div className="mt-5"><Field label="Section heading" value={content.features.heading} max={100} onChange={(v) => set("features", { heading: v })} /></div>
          <div className="mt-5 space-y-3">
            {content.features.items.map((f, i) => {
              const update = (patch: Partial<typeof f>) => set("features", { items: content.features.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[130px_1fr_2fr_auto] md:items-end">
                  <label className="block text-sm font-medium text-slate-700">Icon
                    <select value={f.icon} onChange={(e) => update({ icon: e.target.value as typeof f.icon })} className={input}>{FEATURE_ICONS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                  </label>
                  <Field label="Title" value={f.title} max={50} onChange={(v) => update({ title: v })} />
                  <Field label="Text" value={f.text} max={200} onChange={(v) => update({ text: v })} />
                  <button type="button" aria-label="Remove feature" onClick={() => set("features", { items: content.features.items.filter((_, j) => j !== i) })} className={ghostBtn}><Trash2 className="size-3.5" /></button>
                </div>
              );
            })}
            {content.features.items.length < 12 && <button type="button" onClick={() => set("features", { items: [...content.features.items, { icon: "sparkles", title: "New feature", text: "Describe it here." }] })} className={ghostBtn}><Plus className="size-3.5" />Add feature</button>}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">How it works</h2>
          <div className="mt-5"><Field label="Section heading" value={content.how.heading} max={100} onChange={(v) => set("how", { heading: v })} /></div>
          <div className="mt-5 space-y-3">
            {content.how.steps.map((s, i) => {
              const update = (patch: Partial<typeof s>) => set("how", { steps: content.how.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
                  <Field label={`Step ${i + 1} title`} value={s.title} max={50} onChange={(v) => update({ title: v })} />
                  <Field label="Text" value={s.text} max={200} onChange={(v) => update({ text: v })} />
                  <button type="button" aria-label="Remove step" onClick={() => set("how", { steps: content.how.steps.filter((_, j) => j !== i) })} className={ghostBtn}><Trash2 className="size-3.5" /></button>
                </div>
              );
            })}
            {content.how.steps.length < 6 && <button type="button" onClick={() => set("how", { steps: [...content.how.steps, { title: "New step", text: "Describe this step." }] })} className={ghostBtn}><Plus className="size-3.5" />Add step</button>}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Plans section</h2>
          <p className="mt-1 text-sm text-slate-500">Plan names, features and limits come from the platform itself. Only the heading and intro are editable here.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Heading" value={content.plans.heading} max={100} onChange={(v) => set("plans", { heading: v })} />
            <Field label="Intro" value={content.plans.intro} max={240} onChange={(v) => set("plans", { intro: v })} />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Frequently asked questions</h2>
          <div className="mt-5"><Field label="Section heading" value={content.faq.heading} max={100} onChange={(v) => set("faq", { heading: v })} /></div>
          <div className="mt-5 space-y-3">
            {content.faq.items.map((f, i) => {
              const update = (patch: Partial<typeof f>) => set("faq", { items: content.faq.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  <Field label="Question" value={f.q} max={150} onChange={(v) => update({ q: v })} />
                  <div className="mt-3"><Field label="Answer" multiline value={f.a} max={600} onChange={(v) => update({ a: v })} /></div>
                  <button type="button" onClick={() => set("faq", { items: content.faq.items.filter((_, j) => j !== i) })} className={`${ghostBtn} mt-3`}><Trash2 className="size-3.5" />Remove</button>
                </div>
              );
            })}
            {content.faq.items.length < 12 && <button type="button" onClick={() => set("faq", { items: [...content.faq.items, { q: "New question", a: "Answer." }] })} className={ghostBtn}><Plus className="size-3.5" />Add question</button>}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Closing banner and footer</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2"><Field label="Closing banner heading" value={content.cta.heading} max={120} onChange={(v) => set("cta", { heading: v })} /></div>
            <Field label="Contact email (shown in footer, optional)" value={content.footer.contactEmail} max={120} onChange={(v) => set("footer", { contactEmail: v })} />
            <Field label="Footer tagline (optional)" value={content.footer.tagline} max={120} onChange={(v) => set("footer", { tagline: v })} />
          </div>
        </section>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-[#FAF6F6]/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={reset} disabled={saving} className={ghostBtn}><RotateCcw className="size-3.5" />Restore defaults</button>
            <p className="hidden text-xs text-slate-500 sm:block">{updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Using default content"}</p>
          </div>
          <button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#782F43] px-5 text-sm font-medium text-white hover:bg-[#244638] disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving…" : "Save and publish"}
          </button>
        </div>
      </form>
    </main>
  );
}
