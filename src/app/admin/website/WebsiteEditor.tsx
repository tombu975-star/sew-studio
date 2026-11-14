"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, ImageIcon, Loader2, Plus, RotateCcw, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
import { api, apiErrorMessage, apiGet } from "@/lib/api";
import { shrink } from "@/lib/imageUpload";
import { DEFAULT_WEBSITE_CONTENT, type WebsiteContent } from "@/lib/website-content";

type Loaded = { content: WebsiteContent; updatedAt: string | null };

const input = "mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10";
const area = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/10";
const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const ghostBtn = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50";

function Field({ label, value, onChange, max, multiline, rows = 3, hint, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; max: number; multiline?: boolean; rows?: number; hint?: string; placeholder?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {multiline
        ? <textarea rows={rows} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={area} />
        : <input maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={input} />}
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {intro && <p className="mt-1 text-sm text-slate-500">{intro}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

interface LibImage { id: string; name: string; url: string; size: number }

/** The admin's uploaded pictures: list, upload (resized in the browser) and delete. */
function useImageLibrary(enabled: boolean) {
  const [images, setImages] = useState<LibImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setImages((await apiGet<{ images: LibImage[] }>("/api/admin/site-images")).images); }
    catch (err) { setError(apiErrorMessage(err, "Could not load the picture library.")); }
  }, []);
  useEffect(() => { if (enabled) void refresh(); }, [enabled, refresh]);

  async function upload(file: File): Promise<string | null> {
    setBusy(true); setError("");
    try {
      if (!file.type.startsWith("image/")) throw new Error("Please choose a picture file.");
      const body = await shrink(file);
      const form = new FormData();
      form.append("file", body, body instanceof File ? body.name : file.name || "picture.jpg");
      const res = await fetch("/api/admin/site-images", { method: "POST", body: form, credentials: "same-origin" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed. Please try again.");
      await refresh();
      return json.url as string;
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); return null; }
    finally { setBusy(false); }
  }
  async function remove(img: LibImage) {
    if (!window.confirm(`Delete “${img.name || "this picture"}” from the library?`)) return;
    setError("");
    try { await api(`/api/admin/site-images/${img.id}`, { method: "DELETE" }); await refresh(); }
    catch (err) { setError(apiErrorMessage(err, "Could not delete the picture.")); }
  }
  return { images, busy, error, upload, remove };
}
type Library = ReturnType<typeof useImageLibrary>;

/** Shows the current picture and lets the admin upload a new one or pick from the library. */
function ImagePicker({ label, value, onChange, lib, fallback, optional }: {
  label: string; value: string; onChange: (v: string) => void; lib: Library; fallback?: string; optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <div className="grid h-28 w-40 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="size-6 text-slate-400" aria-hidden="true" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen((o) => !o)} className={ghostBtn}><ImageIcon className="size-3.5" />{open ? "Close" : "Change picture"}</button>
          {fallback && value !== fallback && <button type="button" onClick={() => onChange(fallback)} className={ghostBtn}><RotateCcw className="size-3.5" />Use original</button>}
          {optional && value && <button type="button" onClick={() => onChange("")} className={ghostBtn}><Trash2 className="size-3.5" />Remove picture</button>}
        </div>
      </div>
      {open && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#800020] px-3 text-xs font-medium text-white hover:bg-[#650019]">
            {lib.busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}Upload a new picture
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={lib.busy}
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const url = await lib.upload(f); if (url) { onChange(url); setOpen(false); } }} />
          </label>
          <span className="ml-3 text-xs text-slate-500">JPG, PNG, WebP or GIF, up to 5 MB. Large photos are resized automatically.</span>
          {lib.error && <p role="alert" className="mt-2 text-xs text-red-700">{lib.error}</p>}
          {lib.images.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {lib.images.map((img) => (
                <li key={img.id} className="group relative">
                  <button type="button" onClick={() => { onChange(img.url); setOpen(false); }} aria-label={`Use ${img.name}`} className={`block w-full overflow-hidden rounded-lg border-2 ${value === img.url ? "border-[#800020]" : "border-transparent hover:border-slate-300"}`}>
                    <img src={img.url} alt={img.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  </button>
                  <button type="button" aria-label={`Delete ${img.name}`} onClick={() => void lib.remove(img)} className="absolute right-1 top-1 hidden rounded bg-white/90 p-1 text-red-700 shadow group-hover:block focus:block"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-xs text-slate-500">No uploaded pictures yet.</p>}
        </div>
      )}
    </div>
  );
}

/** Add / edit / remove a list of single-line or multi-line strings. */
function StringList({ label, items, onChange, max, maxItems, multiline, addLabel }: {
  label: string; items: string[]; onChange: (next: string[]) => void; max: number; maxItems: number; multiline?: boolean; addLabel: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 space-y-3">
        {items.map((value, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              {multiline
                ? <textarea aria-label={`${label} ${i + 1}`} rows={3} maxLength={max} value={value} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={area.replace("mt-1.5 ", "")} />
                : <input aria-label={`${label} ${i + 1}`} maxLength={max} value={value} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={input.replace("mt-1.5 ", "")} />}
            </div>
            {items.length > 1 && <button type="button" aria-label={`Remove ${label} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))} className={ghostBtn}><Trash2 className="size-3.5" /></button>}
          </div>
        ))}
        {items.length < maxItems && <button type="button" onClick={() => onChange([...items, ""])} className={ghostBtn}><Plus className="size-3.5" />{addLabel}</button>}
      </div>
    </div>
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
  const { site, seo, nav, contact, home, footer, legal, story } = content;
  const lib = useImageLibrary(authorized);
  const setHome = (patch: Partial<WebsiteContent["home"]>) => set("home", patch);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try {
      const data = await api<Loaded>("/api/admin/website-content", { method: "PUT", body: JSON.stringify(content) });
      setContent(data.content); setUpdatedAt(data.updatedAt); setSaved(true);
    } catch (err) { setError(apiErrorMessage(err, "Could not save website content.")); }
    finally { setSaving(false); }
  }

  async function reset() {
    if (!window.confirm("Restore all website text and links to the original defaults? Your edits will be lost.")) return;
    setSaving(true); setError(""); setSaved(false);
    try { await api("/api/admin/website-content", { method: "DELETE" }); await load(); setSaved(true); }
    catch (err) { setError(apiErrorMessage(err, "Could not reset website content.")); }
    finally { setSaving(false); }
  }

  if (checking || (authorized && loading)) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6]"><Loader2 className="size-6 animate-spin text-[#800020]" aria-label="Loading" /></main>;
  if (!authorized) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6] px-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><ShieldCheck className="mx-auto size-8 text-[#800020]" /><h1 className="mt-4 text-xl font-semibold">Platform administrator sign-in required</h1><p className="mt-2 text-sm text-slate-500">Sign in at the admin portal, then return to edit the website.</p><a className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#800020] px-4 text-sm font-medium text-white" href="/admin">Open admin portal</a></section></main>;

  return (
    <main className="min-h-dvh bg-[#FAF6F6] px-4 py-8 text-slate-900 sm:px-8">
      <form onSubmit={save} className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-[#800020]">
          <a href="/admin" className="hover:underline">← Back to platform admin</a>
          <a href="/admin/integrations" className="hover:underline">Integrations &amp; API keys →</a>
        </div>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#85563A]">Public website</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Website content</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Edit every piece of text, link and address on the public website: the home page, menu, footer, contact details, products and the legal pages. Changes go live as soon as you save.</p>
          <a href="/" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#800020] hover:underline">View website <ExternalLink className="size-3.5" /></a>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mr-2 inline size-4" />{error}</div>}
        {saved && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline size-4" />Saved. The website is updated.</div>}

        <Section title="Addresses and links" intro="Web addresses used across the site, in emails and in sign-in links. You can change these at any time without redeploying.">
          <Field label="Public address of the app" value={site.appUrl} max={300} onChange={(v) => set("site", { appUrl: v })} placeholder="https://your-app.up.railway.app" hint="Used for links in emails (password resets, Academy sign-in, certificates). Leave empty to use the address the site is opened from." />
          <Field label="Studio sign-in / sign-up address" value={site.studioUrl} max={500} onChange={(v) => set("site", { studioUrl: v })} placeholder="/studio" hint="Where “Create your studio account” and “Enter your studio” go. Leave empty to use the /studio page on this site." />
          <Field label="Free webinar sign-up form (optional)" value={site.webinarFormUrl} max={300} onChange={(v) => set("site", { webinarFormUrl: v })} placeholder="https://…" />
        </Section>

        <Section title="Brand and search results">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Brand name" value={site.name} max={60} onChange={(v) => set("site", { name: v })} />
            <Field label="Tagline (footer)" value={site.line} max={160} onChange={(v) => set("site", { line: v })} />
          </div>
          <Field label="Home page title (browser tab and Google)" value={seo.title} max={120} onChange={(v) => set("seo", { title: v })} />
          <Field label="Home page description (Google and link previews)" multiline value={seo.description} max={300} onChange={(v) => set("seo", { description: v })} />
        </Section>

        <Section title="Header menu">
          <div className="space-y-3">
            {nav.items.map((item, i) => {
              const update = (patch: Partial<typeof item>) => set("nav", { items: nav.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
                  <Field label="Label" value={item.label} max={30} onChange={(v) => update({ label: v })} />
                  <Field label="Goes to" value={item.href} max={300} onChange={(v) => update({ href: v })} placeholder="/academy or https://…" />
                  {nav.items.length > 1 && <button type="button" aria-label="Remove menu item" onClick={() => set("nav", { items: nav.items.filter((_, j) => j !== i) })} className={ghostBtn}><Trash2 className="size-3.5" /></button>}
                </div>
              );
            })}
            {nav.items.length < 8 && <button type="button" onClick={() => set("nav", { items: [...nav.items, { label: "New link", href: "/" }] })} className={ghostBtn}><Plus className="size-3.5" />Add menu item</button>}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Sign-in button (desktop)" value={nav.enterLabel} max={30} onChange={(v) => set("nav", { enterLabel: v })} />
            <Field label="Sign-in button (phone)" value={nav.enterLabelShort} max={20} onChange={(v) => set("nav", { enterLabelShort: v })} />
          </div>
        </Section>

        <Section title="Contact details" intro="Shown in the footer, the contact section and the legal pages. Leave a field empty to hide it.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="General email" value={contact.generalEmail} max={120} onChange={(v) => set("contact", { generalEmail: v })} />
            <Field label="Support email" value={contact.supportEmail} max={120} onChange={(v) => set("contact", { supportEmail: v })} />
            <Field label="WhatsApp number (as shown)" value={contact.whatsappDisplay} max={40} onChange={(v) => set("contact", { whatsappDisplay: v })} />
            <Field label="WhatsApp link" value={contact.whatsappLink} max={500} onChange={(v) => set("contact", { whatsappLink: v })} placeholder="https://wa.me/233…" />
            <Field label="Community group link" value={contact.community} max={500} onChange={(v) => set("contact", { community: v })} />
            <Field label="TikTok link" value={contact.tiktok} max={500} onChange={(v) => set("contact", { tiktok: v })} />
            <Field label="TikTok name (as shown)" value={contact.tiktokHandle} max={60} onChange={(v) => set("contact", { tiktokHandle: v })} />
          </div>
        </Section>

        <Section title="Home page: top banner">
          <Field label="Headline" value={home.heroHeadline} max={160} onChange={(v) => setHome({ heroHeadline: v })} />
          <Field label="Supporting text" multiline value={home.heroText} max={500} onChange={(v) => setHome({ heroText: v })} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Main button" value={home.heroPrimaryCta} max={40} onChange={(v) => setHome({ heroPrimaryCta: v })} />
            <Field label="Second button" value={home.heroSecondaryCta} max={40} onChange={(v) => setHome({ heroSecondaryCta: v })} />
          </div>
          <Field label="Small note under the buttons (optional)" value={home.heroNote} max={200} onChange={(v) => setHome({ heroNote: v })} />
          <ImagePicker label="Top banner picture" value={home.heroImage} lib={lib} fallback={DEFAULT_WEBSITE_CONTENT.home.heroImage} onChange={(v) => setHome({ heroImage: v })} />
          <Field label="Describe the picture (for screen readers)" value={home.heroImageAlt} max={200} onChange={(v) => setHome({ heroImageAlt: v })} />
          <div className="grid gap-4 md:grid-cols-3">
            {home.promises.map((p, i) => {
              const update = (patch: Partial<typeof p>) => setHome({ promises: home.promises.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <Field label={`Promise ${i + 1} title`} value={p.title} max={40} onChange={(v) => update({ title: v })} />
                  <Field label="Text" multiline rows={2} value={p.text} max={160} onChange={(v) => update({ text: v })} />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Home page: our story, mission and vision">
          <Field label="Heading" value={home.whoHeading} max={160} onChange={(v) => setHome({ whoHeading: v })} />
          <StringList label="Paragraphs" items={home.whoParagraphs} max={700} maxItems={4} multiline addLabel="Add paragraph" onChange={(next) => setHome({ whoParagraphs: next })} />
          <ImagePicker label="Picture beside the story" value={home.whoImage} lib={lib} fallback={DEFAULT_WEBSITE_CONTENT.home.whoImage} onChange={(v) => setHome({ whoImage: v })} />
          <Field label="Describe the picture (for screen readers)" value={home.whoImageAlt} max={200} onChange={(v) => setHome({ whoImageAlt: v })} />
          <Field label="Badge over the photo (optional)" value={home.whoBadge} max={160} onChange={(v) => setHome({ whoBadge: v })} />
          <StringList label="Who it is for" items={home.audience} max={60} maxItems={8} addLabel="Add audience" onChange={(next) => setHome({ audience: next })} />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3"><Field label="Mission title" value={home.missionTitle} max={40} onChange={(v) => setHome({ missionTitle: v })} /><Field label="Mission" multiline rows={5} value={home.mission} max={600} onChange={(v) => setHome({ mission: v })} /></div>
            <div className="space-y-3"><Field label="Vision title" value={home.visionTitle} max={40} onChange={(v) => setHome({ visionTitle: v })} /><Field label="Vision" multiline rows={5} value={home.vision} max={600} onChange={(v) => setHome({ vision: v })} /></div>
          </div>
        </Section>

        <Section title="Home page: the platform" intro="The five cards keep their pictures; you edit the names and descriptions.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Heading" value={home.appHeading} max={160} onChange={(v) => setHome({ appHeading: v })} />
            <Field label="Short intro" value={home.appIntro} max={240} onChange={(v) => setHome({ appIntro: v })} />
          </div>
          <div className="space-y-3">
            {home.features.map((f, i) => {
              const update = (patch: Partial<typeof f>) => setHome({ features: home.features.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_2fr]">
                  <Field label={`Card ${i + 1} name`} value={f.name} max={80} onChange={(v) => update({ name: v })} />
                  <Field label="Description" multiline rows={2} value={f.text} max={400} onChange={(v) => update({ text: v })} />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Home page: free trial and Academy cards">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold">Free trial card</p>
              <Field label="Badge" value={home.tryBadge} max={40} onChange={(v) => setHome({ tryBadge: v })} />
              <Field label="Heading" value={home.tryHeading} max={60} onChange={(v) => setHome({ tryHeading: v })} />
              <Field label="Text" multiline rows={5} value={home.tryText} max={500} onChange={(v) => setHome({ tryText: v })} />
              <Field label="Button" value={home.tryCta} max={40} onChange={(v) => setHome({ tryCta: v })} />
              <ImagePicker label="Decorative picture" value={home.tryImage} lib={lib} fallback={DEFAULT_WEBSITE_CONTENT.home.tryImage} onChange={(v) => setHome({ tryImage: v })} />
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold">Academy card</p>
              <Field label="Badge" value={home.academyBadge} max={40} onChange={(v) => setHome({ academyBadge: v })} />
              <Field label="Heading" value={home.academyHeading} max={60} onChange={(v) => setHome({ academyHeading: v })} />
              <Field label="Text" multiline rows={5} value={home.academyText} max={500} onChange={(v) => setHome({ academyText: v })} />
              <Field label="Button" value={home.academyCta} max={40} onChange={(v) => setHome({ academyCta: v })} hint="Goes to the sign-up form set under Addresses and links. Until that is set, the button reads “Sign-up opens soon”." />
            </div>
          </div>
        </Section>

        <Section title="Home page: products" intro="Each product opens its link in a new tab. Group names become the headings.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Heading" value={home.productsHeading} max={160} onChange={(v) => setHome({ productsHeading: v })} />
            <Field label="Short intro (optional)" value={home.productsIntro} max={200} onChange={(v) => setHome({ productsIntro: v })} />
          </div>
          <div className="space-y-4">
            {home.productGroups.map((g, gi) => {
              const updateGroup = (patch: Partial<typeof g>) => setHome({ productGroups: home.productGroups.map((x, j) => (j === gi ? { ...x, ...patch } : x)) });
              return (
                <div key={gi} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1"><Field label={`Group ${gi + 1} title`} value={g.title} max={60} onChange={(v) => updateGroup({ title: v })} /></div>
                    {home.productGroups.length > 1 && <button type="button" onClick={() => setHome({ productGroups: home.productGroups.filter((_, j) => j !== gi) })} className={ghostBtn}><Trash2 className="size-3.5" />Remove group</button>}
                  </div>
                  <div className="mt-4 space-y-3">
                    {g.products.map((p, pi) => {
                      const updateProduct = (patch: Partial<typeof p>) => updateGroup({ products: g.products.map((x, j) => (j === pi ? { ...x, ...patch } : x)) });
                      return (
                        <div key={pi} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[2fr_1fr_3fr_auto] md:items-end">
                          <Field label="Name" value={p.name} max={80} onChange={(v) => updateProduct({ name: v })} />
                          <Field label="Price" value={p.price} max={30} onChange={(v) => updateProduct({ price: v })} hint="Use “Free” for a free product" />
                          <Field label="Link" value={p.href} max={500} onChange={(v) => updateProduct({ href: v })} />
                          {g.products.length > 1 && <button type="button" aria-label="Remove product" onClick={() => updateGroup({ products: g.products.filter((_, j) => j !== pi) })} className={ghostBtn}><Trash2 className="size-3.5" /></button>}
                        </div>
                      );
                    })}
                    {g.products.length < 12 && <button type="button" onClick={() => updateGroup({ products: [...g.products, { name: "New product", price: "Free", href: "https://" }] })} className={ghostBtn}><Plus className="size-3.5" />Add product</button>}
                  </div>
                </div>
              );
            })}
            {home.productGroups.length < 6 && <button type="button" onClick={() => setHome({ productGroups: [...home.productGroups, { title: "New group", products: [{ name: "New product", price: "Free", href: "https://" }] }] })} className={ghostBtn}><Plus className="size-3.5" />Add group</button>}
          </div>
        </Section>

        <Section title="Home page: contact section and closing banner">
          <Field label="Contact heading" value={home.contactHeading} max={160} onChange={(v) => setHome({ contactHeading: v })} />
          <Field label="Contact text (optional)" value={home.contactText} max={300} onChange={(v) => setHome({ contactText: v })} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="WhatsApp button" value={home.contactWhatsappCta} max={40} onChange={(v) => setHome({ contactWhatsappCta: v })} />
            <Field label="Community button" value={home.contactCommunityCta} max={40} onChange={(v) => setHome({ contactCommunityCta: v })} />
            <Field label="Closing banner heading" value={home.closingHeading} max={160} onChange={(v) => setHome({ closingHeading: v })} />
            <Field label="Closing banner button" value={home.closingCta} max={40} onChange={(v) => setHome({ closingCta: v })} />
          </div>
          <ImagePicker label="Closing banner background picture" value={home.closingImage} lib={lib} fallback={DEFAULT_WEBSITE_CONTENT.home.closingImage} onChange={(v) => setHome({ closingImage: v })} />
        </Section>

        <Section title="Our story page" intro="The text of the Our story page (/our-story). Markdown: ## headings, **bold**, blank line between paragraphs.">
          <ImagePicker label="Picture at the top of the page" value={story.image} lib={lib} optional fallback={DEFAULT_WEBSITE_CONTENT.story.image} onChange={(v) => set("story", { image: v })} />
          {story.image && <Field label="Describe the picture (for screen readers)" value={story.imageAlt} max={200} onChange={(v) => set("story", { imageAlt: v })} />}
          <Field label="Page text" multiline rows={16} value={story.body} max={20000} onChange={(v) => set("story", { body: v })} hint="To put a picture inside the text, upload it above, then write ![description](address) using that picture's address." />
          <div>
            <p className="text-sm font-medium text-slate-700">More pictures (shown under the text)</p>
            <div className="mt-2 space-y-3">
              {story.gallery.map((g, i) => {
                const update = (patch: Partial<typeof g>) => set("story", { gallery: story.gallery.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <div key={i} className="space-y-3">
                    <ImagePicker label={`Picture ${i + 1}`} value={g.src} lib={lib} onChange={(v) => update({ src: v })} />
                    <div className="flex items-end gap-2"><div className="flex-1"><Field label="Describe the picture" value={g.alt} max={200} onChange={(v) => update({ alt: v })} /></div><button type="button" onClick={() => set("story", { gallery: story.gallery.filter((_, j) => j !== i) })} className={ghostBtn}><Trash2 className="size-3.5" />Remove</button></div>
                  </div>
                );
              })}
              {story.gallery.length < 8 && <button type="button" onClick={() => set("story", { gallery: [...story.gallery, { src: DEFAULT_WEBSITE_CONTENT.story.image, alt: "" }] })} className={ghostBtn}><Plus className="size-3.5" />Add a picture</button>}
            </div>
          </div>
        </Section>

        <Section title="Footer">
          <Field label="Text after the tagline (optional)" multiline rows={2} value={footer.blurb} max={300} onChange={(v) => set("footer", { blurb: v })} />
        </Section>

        <Section title="Legal pages" intro="The Privacy Policy and Terms of Use have built-in text. To replace one, paste your own below (Markdown: # headings, - lists, [links](https://…)). Leave empty to keep the built-in text.">
          <Field label="“Last updated” date shown on both pages" value={site.lastUpdated} max={60} onChange={(v) => set("site", { lastUpdated: v })} />
          <Field label="Privacy Policy (replaces the built-in text)" multiline rows={10} value={legal.privacyMarkdown} max={40000} onChange={(v) => set("legal", { privacyMarkdown: v })} />
          <Field label="Terms of Use (replaces the built-in text)" multiline rows={10} value={legal.termsMarkdown} max={40000} onChange={(v) => set("legal", { termsMarkdown: v })} />
        </Section>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-[#FAF6F6]/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={reset} disabled={saving} className={ghostBtn}><RotateCcw className="size-3.5" />Restore defaults</button>
            <p className="hidden text-xs text-slate-500 sm:block">{updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : "Using default content"}</p>
          </div>
          <button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#800020] px-5 text-sm font-medium text-white hover:bg-[#650019] disabled:opacity-60">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{saving ? "Saving…" : "Save and publish"}
          </button>
        </div>
      </form>
    </main>
  );
}
