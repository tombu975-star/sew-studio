"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Eye, EyeOff, Loader2, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { api, apiErrorMessage, apiGet } from "@/lib/api";

type Row = {
  id: string; title: string; description: string | null; presenter: string | null; kind: string; startsAt: string | null;
  durationMinutes: number; meetingUrl: string | null; replayUrl: string | null; status: string; capacity: number | null; published: boolean; signedUp: number;
};
type Signup = { fullName: string; email: string; phone: string | null; aboutYou: string | null; signedUpAt: string };
type Form = { title: string; description: string; presenter: string; kind: string; startsAt: string; durationMinutes: string; meetingUrl: string; replayUrl: string; status: string; capacity: string; published: boolean };

const EMPTY: Form = { title: "", description: "", presenter: "", kind: "Webinar", startsAt: "", durationMinutes: "60", meetingUrl: "", replayUrl: "", status: "Scheduled", capacity: "", published: true };
const input = "mt-1.5 h-11 w-full rounded-lg border border-[#D2B9BF] bg-white px-3 text-sm outline-none focus:border-[#650019] focus:ring-4 focus:ring-[#650019]/10";
const card = "rounded-2xl border border-[#E6D4D8] bg-white p-5 shadow-sm sm:p-7";
const ghost = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D2B9BF] px-3 text-xs font-semibold text-[#650019] hover:bg-[#FBF1F3]";
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function TrainingsAdmin() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [signupsFor, setSignupsFor] = useState<Row | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await apiGet<Row[]>("/api/admin/trainings")); setError(""); }
    catch (err) { setError(apiErrorMessage(err, "Could not load sessions.")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { apiGet("/api/admin-auth/me").then(() => setAuthorized(true)).catch(() => setAuthorized(false)).finally(() => setChecking(false)); }, []);
  useEffect(() => { if (authorized) void load(); }, [authorized, load]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value } : f));

  function startEdit(r: Row | null) {
    setNotice(""); setError("");
    setEditingId(r?.id ?? null);
    setForm(r ? { title: r.title, description: r.description ?? "", presenter: r.presenter ?? "", kind: r.kind, startsAt: toLocal(r.startsAt), durationMinutes: String(r.durationMinutes), meetingUrl: r.meetingUrl ?? "", replayUrl: r.replayUrl ?? "", status: r.status, capacity: r.capacity ? String(r.capacity) : "", published: r.published } : EMPTY);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form) return;
    setSaving(true); setError(""); setNotice("");
    const body = { ...form, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, durationMinutes: Number(form.durationMinutes) || 60, capacity: form.capacity ? Number(form.capacity) : null };
    try {
      await api(editingId ? `/api/admin/trainings/${editingId}` : "/api/admin/trainings", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) });
      setForm(null); setNotice(editingId ? "Session updated." : "Session published to the website."); await load();
    } catch (err) { setError(apiErrorMessage(err, "Could not save the session.")); }
    finally { setSaving(false); }
  }

  async function remove(r: Row) {
    if (!window.confirm(`Delete "${r.title}" and its ${r.signedUp} sign-up${r.signedUp === 1 ? "" : "s"}?`)) return;
    try { await api(`/api/admin/trainings/${r.id}`, { method: "DELETE" }); setNotice("Session deleted."); await load(); }
    catch (err) { setError(apiErrorMessage(err, "Could not delete the session.")); }
  }
  async function togglePublished(r: Row) {
    try { await api(`/api/admin/trainings/${r.id}`, { method: "PATCH", body: JSON.stringify({ published: !r.published }) }); await load(); }
    catch (err) { setError(apiErrorMessage(err, "Could not update the session.")); }
  }
  async function showSignups(r: Row) {
    setSignupsFor(r);
    try { setSignups(await apiGet<Signup[]>(`/api/admin/trainings/${r.id}/registrations`)); }
    catch (err) { setError(apiErrorMessage(err, "Could not load sign-ups.")); }
  }

  if (checking || (authorized && loading && !rows.length)) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6]"><Loader2 className="size-6 animate-spin text-[#650019]" aria-label="Loading" /></main>;
  if (!authorized) return <main className="grid min-h-dvh place-items-center bg-[#FAF6F6] px-5"><section className="w-full max-w-md rounded-2xl border border-[#E6D4D8] bg-white p-7 text-center shadow-sm"><ShieldCheck className="mx-auto size-8 text-[#650019]" /><h1 className="mt-4 text-xl font-semibold">Platform administrator sign-in required</h1><a className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#650019] px-4 text-sm font-medium text-white" href="/admin">Open admin portal</a></section></main>;

  return (
    <main className="min-h-dvh bg-[#FAF6F6] px-4 py-8 text-[#2F151B] sm:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <a href="/admin" className="text-sm font-medium text-[#650019] hover:underline">← Back to platform admin</a>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#832138]">Public website</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Public trainings & webinars</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-600">Sessions shown on the website for anyone, no account needed. Visitors sign up with their name and email and get the join link. <a className="font-semibold text-[#650019] underline" href="/training" target="_blank" rel="noreferrer">View the public page</a></p>
          </div>
          {!form && <button onClick={() => startEdit(null)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#650019] px-5 text-sm font-semibold text-white hover:bg-[#4A0010]"><Plus className="size-4" />New session</button>}
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mr-2 inline size-4" />{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline size-4" />{notice}</div>}

        {form && (
          <form onSubmit={save} className={`${card} space-y-4`}>
            <h2 className="text-lg font-semibold">{editingId ? "Edit session" : "New session"}</h2>
            <label className="block text-sm font-medium">Title<input required maxLength={150} className={input} value={form.title} onChange={set("title")} placeholder="e.g. Getting your first paying clients" /></label>
            <label className="block text-sm font-medium">Description<textarea rows={3} maxLength={2000} className={`${input} h-auto py-2.5`} value={form.description} onChange={set("description")} /></label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium">Type<select className={input} value={form.kind} onChange={set("kind")}>{["Webinar", "Class", "Training"].map((k) => <option key={k}>{k}</option>)}</select></label>
              <label className="block text-sm font-medium">Status<select className={input} value={form.status} onChange={set("status")}>{["Scheduled", "Live", "Completed", "Cancelled"].map((k) => <option key={k}>{k}</option>)}</select></label>
              <label className="block text-sm font-medium">Presenter<input maxLength={100} className={input} value={form.presenter} onChange={set("presenter")} /></label>
              <label className="block text-sm font-medium sm:col-span-2">Date and time<input type="datetime-local" className={input} value={form.startsAt} onChange={set("startsAt")} /></label>
              <label className="block text-sm font-medium">Minutes<input type="number" min={5} max={1440} className={input} value={form.durationMinutes} onChange={set("durationMinutes")} /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Join link (sent after sign-up)<input type="url" className={input} value={form.meetingUrl} onChange={set("meetingUrl")} placeholder="https://meet.google.com/…" /></label>
              <label className="block text-sm font-medium">Replay link (after the session)<input type="url" className={input} value={form.replayUrl} onChange={set("replayUrl")} placeholder="https://…" /></label>
              <label className="block text-sm font-medium">Places available (blank = unlimited)<input type="number" min={1} className={input} value={form.capacity} onChange={set("capacity")} /></label>
              <label className="flex items-center gap-2 pt-7 text-sm font-medium"><input type="checkbox" checked={form.published} onChange={set("published")} className="size-4 accent-[#650019]" />Show on the website</label>
            </div>
            <div className="flex gap-3">
              <button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#650019] px-5 text-sm font-semibold text-white hover:bg-[#4A0010] disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{saving ? "Saving…" : "Save session"}</button>
              <button type="button" onClick={() => setForm(null)} className={`${ghost} h-11 px-5 text-sm`}>Cancel</button>
            </div>
          </form>
        )}

        <section className={card}>
          <h2 className="text-lg font-semibold">All sessions</h2>
          {rows.length === 0 ? <p className="mt-4 text-sm text-stone-600">No sessions yet. Create the first one to show it on the website.</p> : (
            <ul className="mt-4 divide-y divide-[#EEDFE3]">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-stone-600">{r.kind} · {r.status} · {r.startsAt ? new Date(r.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No date yet"} · {r.published ? "Visible on website" : "Hidden"}</p>
                  </div>
                  <button onClick={() => showSignups(r)} className={ghost}><Users className="size-3.5" />{r.signedUp}{r.capacity ? ` / ${r.capacity}` : ""} signed up</button>
                  <button onClick={() => togglePublished(r)} aria-label={r.published ? "Hide from website" : "Show on website"} className={ghost}>{r.published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                  <button onClick={() => startEdit(r)} aria-label="Edit" className={ghost}><Pencil className="size-3.5" /></button>
                  <button onClick={() => remove(r)} aria-label="Delete" className={ghost}><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {signupsFor && (
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Sign-ups: {signupsFor.title}</h2>
              <div className="flex gap-2">
                <a className={ghost} href={`/api/admin/trainings/${signupsFor.id}/registrations?format=csv`} download><Download className="size-3.5" />Download CSV</a>
                <button className={ghost} onClick={() => setSignupsFor(null)}>Close</button>
              </div>
            </div>
            {signups.length === 0 ? <p className="mt-4 text-sm text-stone-600">Nobody has signed up yet.</p> : (
              <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-stone-600"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Phone</th><th className="py-2 pr-4">About</th><th className="py-2">Signed up</th></tr></thead>
                <tbody>{signups.map((s) => <tr key={s.email} className="border-t border-[#EEDFE3]"><td className="py-2 pr-4">{s.fullName}</td><td className="py-2 pr-4">{s.email}</td><td className="py-2 pr-4">{s.phone || "-"}</td><td className="py-2 pr-4">{s.aboutYou || "-"}</td><td className="py-2">{new Date(s.signedUpAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
