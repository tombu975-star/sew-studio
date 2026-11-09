"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  ExternalLink,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  Package,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/atelier/_portal";
import { apiGet, apiPost, apiPatch, apiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { MENU_DEFINITIONS, type MenuKey } from "@/lib/menu-config";

interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
}

interface ShopSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  currency: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  userCount: number;
  orderCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
}

interface ShopDetail extends Omit<ShopSummary, "userCount" | "orderCount"> {
  customerCount: number;
  trialStartedAt: string;
  trialEndsAt: string;
  latestPlanRequest: {
    id: string;
    requestedPlan: "pro" | "enterprise";
    status: "pending" | "approved" | "declined";
    message: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  members: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    phone: string | null;
    createdAt: string;
  }[];
  recentOrders: {
    id: string;
    garmentDesign: string;
    status: string;
    sellingPrice: number | null;
    orderDate: string;
    customerName: string | null;
  }[];
}

export function AdminPortalClient() {
  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    apiGet<AdminProfile>("/api/admin-auth/me")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-dvh grid place-items-center bg-[#F6F7F9]">
        <Loader2 className="size-6 animate-spin text-[#416A59]" aria-label="Loading admin portal" />
      </div>
    );
  }
  if (!admin) return <AdminLogin onLoggedIn={setAdmin} />;
  return <AdminDashboard admin={admin} onLogout={() => setAdmin(null)} />;
}

function AdminLogin({ onLoggedIn }: { onLoggedIn: (admin: AdminProfile) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await apiPost<{ admin: AdminProfile }>("/api/admin-auth/login", { email, password });
      onLoggedIn(result.admin);
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#F6F7F9] px-5 py-10">
      <div className="w-full max-w-[410px]">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#315B4A] text-white shadow-sm"><ShieldCheck className="size-5" /></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#527564]">Madam Studio</p><p className="text-sm text-slate-500">Platform operations</p></div>
        </div>
        <SectionCard>
          <div className="mb-6"><h1 className="font-display text-2xl font-semibold text-slate-900">System admin</h1><p className="mt-1 text-sm text-slate-500">Sign in to manage your platform.</p></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-xs font-medium text-slate-600">Email<input type="email" required autoComplete="username" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#527564] focus:ring-4 focus:ring-[#527564]/10" /></label>
            <label className="block text-xs font-medium text-slate-600">Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#527564] focus:ring-4 focus:ring-[#527564]/10" /></label>
            {error && <p role="alert" className="flex items-center gap-2 text-sm text-red-700"><AlertCircle className="size-4 shrink-0" />{error}</p>}
            <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#315B4A] text-sm font-medium text-white transition hover:bg-[#244638] disabled:opacity-60">{loading && <Loader2 className="size-4 animate-spin" />}{loading ? "Signing in…" : "Sign in securely"}</button>
          </form>
          <p className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500"><ShieldCheck className="size-3.5 text-[#527564]" />Restricted to authorised platform administrators.</p>
        </SectionCard>
      </div>
    </main>
  );
}

type AdminSection = "overview" | "studios" | "features";
type StudioFilter = "all" | "active" | "suspended" | "setup";

function AdminDashboard({ admin, onLogout }: { admin: AdminProfile; onLogout: () => void }) {
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudioFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiGet<ShopSummary[]>("/api/admin/shops");
      setShops(data);
      setLastUpdated(new Date());
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Could not load studio data."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function handleLogout() {
    try { await apiPost("/api/admin-auth/logout", {}); } finally { onLogout(); }
  }

  const now = Date.now();
  const day = 86_400_000;
  const active = shops.filter((shop) => !shop.suspendedAt);
  const suspended = shops.filter((shop) => Boolean(shop.suspendedAt));
  const totalMembers = shops.reduce((sum, shop) => sum + shop.userCount, 0);
  const totalOrders = shops.reduce((sum, shop) => sum + shop.orderCount, 0);
  const recent = shops.filter((shop) => {
    const created = Date.parse(shop.createdAt);
    return Number.isFinite(created) && now - created >= 0 && now - created < 30 * day;
  });
  const onboarding = active.filter((shop) => shop.orderCount === 0 && now - Date.parse(shop.createdAt) > 14 * day);
  const incompleteOwners = shops.filter((shop) => !shop.ownerName || !shop.ownerEmail);
  const plans = shops.reduce<Record<string, number>>((acc, shop) => {
    const plan = shop.plan?.toLowerCase() || "unassigned";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});
  const filtered = useMemo(() => shops.filter((shop) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [shop.name, shop.slug, shop.ownerName, shop.ownerEmail].some((value) => value?.toLowerCase().includes(needle));
    const matchesFilter = filter === "all" || (filter === "active" && !shop.suspendedAt) || (filter === "suspended" && Boolean(shop.suspendedAt)) || (filter === "setup" && !shop.suspendedAt && shop.orderCount === 0 && now - Date.parse(shop.createdAt) > 14 * day);
    return matchesQuery && matchesFilter;
  }), [shops, query, filter, now]);

  function openSection(next: AdminSection) {
    setSection(next);
    setSelectedId(null);
    setMobileNavOpen(false);
  }

  function exportStudios() {
    const columns = ["Studio", "Slug", "Plan", "Currency", "Status", "Owner", "Owner email", "Members", "Orders", "Created"];
    const rows = filtered.map((shop) => [shop.name, shop.slug, shop.plan, shop.currency, shop.suspendedAt ? "Suspended" : "Active", shop.ownerName || "", shop.ownerEmail || "", shop.userCount, shop.orderCount, shop.createdAt]);
    const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `madam-studio-studios-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const nav = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "studios" as const, label: "Studios", icon: Building2, count: shops.length },
    { id: "features" as const, label: "Feature controls", icon: SlidersHorizontal },
  ];

  return (
    <div className="min-h-dvh bg-[#F6F7F9] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-2 pb-8">
          <div className="grid size-10 place-items-center rounded-xl bg-[#315B4A] text-white"><ShieldCheck className="size-5" /></div>
          <div className="min-w-0"><p className="font-display text-lg font-semibold leading-tight">Madam Studio</p><p className="text-[11px] text-slate-500">System administration</p></div>
          <button onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="ml-auto rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"><X className="size-4" /></button>
        </div>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Workspace</p>
        <nav className="space-y-1" aria-label="Admin sections">
          {nav.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => openSection(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${section === id ? "bg-[#EEF4F0] font-medium text-[#315B4A]" : "text-slate-600 hover:bg-slate-50"}`}><Icon className="size-4" />{label}{count !== undefined && <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">{count}</span>}</button>)}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-[#E1EAE4] bg-[#F5F8F5] p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-[#315B4A]"><ShieldCheck className="size-4" />Admin access</div><p className="mt-1.5 break-all text-[11px] leading-relaxed text-slate-500">Signed in as {admin.email}</p></div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-700"><LogOut className="size-4" />Sign out</button>
        </div>
      </aside>
      {mobileNavOpen && <button aria-label="Close navigation overlay" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" />}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3"><button onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="size-5" /></button><div className="hidden text-xs text-slate-400 sm:block">Platform <ChevronRight className="mx-1 inline size-3" /> <span className="font-medium text-slate-700">{nav.find((item) => item.id === section)?.label}</span></div><div className="text-xs font-medium text-slate-700 sm:hidden">{nav.find((item) => item.id === section)?.label}</div></div>
          <div className="flex items-center gap-2 sm:gap-4"><span className="hidden text-xs text-slate-400 md:block">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span><button onClick={() => void reload()} disabled={loading} aria-label="Refresh platform data" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button><div className="grid size-9 place-items-center rounded-full bg-[#E8F0EB] text-xs font-semibold text-[#315B4A]" title={admin.email}>{initials(admin.fullName)}</div></div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:px-9">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <PageHeader eyebrow="PLATFORM OPERATIONS" title={section === "overview" ? `Good day, ${admin.fullName.split(" ")[0]}` : nav.find((item) => item.id === section)?.label || "Admin"} subtitle={section === "overview" ? "A clear view of studio activity and platform health." : section === "studios" ? "Review studio accounts, ownership, activity, and access." : "Manage platform-wide feature availability."} />
            {section === "studios" && <button onClick={exportStudios} className="mb-6 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"><Download className="size-4" />Export CSV</button>}
          </div>
          {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span className="flex items-center gap-2"><AlertCircle className="size-4 shrink-0" />{loadError}</span><button onClick={() => void reload()} className="font-medium underline underline-offset-2">Try again</button></div>}
          {section === "overview" && <Overview shops={shops} activeCount={active.length} suspendedCount={suspended.length} members={totalMembers} orders={totalOrders} recent={recent} onboarding={onboarding} incompleteOwners={incompleteOwners} plans={plans} loading={loading} onStudios={() => openSection("studios")} onFeatures={() => openSection("features")} onSelectStudio={setSelectedId} />}
          {section === "studios" && <StudioDirectory shops={filtered} allCount={shops.length} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} loading={loading} onSelect={setSelectedId} />}
          {section === "features" && <MenuManagement />}
        </main>
      </div>
      {selectedId && <ShopDetailPanel shopId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => void reload()} />}
    </div>
  );
}

function Overview({ shops, activeCount, suspendedCount, members, orders, recent, onboarding, incompleteOwners, plans, loading, onStudios, onFeatures, onSelectStudio }: {
  shops: ShopSummary[]; activeCount: number; suspendedCount: number; members: number; orders: number; recent: ShopSummary[]; onboarding: ShopSummary[]; incompleteOwners: ShopSummary[]; plans: Record<string, number>; loading: boolean; onStudios: () => void; onFeatures: () => void; onSelectStudio: (id: string) => void;
}) {
  const months = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      const count = shops.filter((shop) => {
        const created = new Date(shop.createdAt);
        return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
      }).length;
      return { label: date.toLocaleDateString("en", { month: "short" }), count };
    });
  }, [shops]);
  const maxMonth = Math.max(1, ...months.map((month) => month.count));
  const alerts = [
    ...shops.filter((shop) => shop.suspendedAt).slice(0, 3).map((shop) => ({ id: shop.id, title: `${shop.name} is suspended`, detail: shop.suspendedReason || "Review access and suspension status.", tone: "red" as const, label: "Review" })),
    ...incompleteOwners.slice(0, 2).map((shop) => ({ id: shop.id, title: `${shop.name} needs owner details`, detail: "Owner name or email is missing from this studio profile.", tone: "amber" as const, label: "Complete" })),
    ...onboarding.slice(0, 2).map((shop) => ({ id: shop.id, title: `${shop.name} may need onboarding`, detail: "No orders recorded and the studio has been active for over two weeks.", tone: "blue" as const, label: "Check in" })),
  ].slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile label="Total studios" value={shops.length} icon={Building2} foot={`${recent.length} joined in the last 30 days`} loading={loading} accent="green" />
        <MetricTile label="Active studios" value={activeCount} icon={CheckCircle2} foot={shops.length ? `${Math.round((activeCount / shops.length) * 100)}% of all accounts` : "No studios yet"} loading={loading} accent="blue" />
        <MetricTile label="Studio members" value={members} icon={Users} foot="Across all workspaces" loading={loading} accent="violet" />
        <MetricTile label="Orders created" value={orders} icon={Package} foot="Platform-wide total" loading={loading} accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <SectionCard className="!p-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Studio growth</h2><p className="mt-1 text-xs text-slate-500">New studio registrations · last 6 months</p></div><button onClick={onStudios} className="inline-flex items-center gap-1 text-xs font-medium text-[#416A59] hover:underline">View studios<ArrowRight className="size-3.5" /></button></div>
          <div className="px-5 pb-5 pt-4">
            <div className="mb-3 flex items-end justify-between"><span className="font-display text-3xl font-semibold text-slate-900">{shops.length}</span><span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4F0] px-2 py-1 text-[11px] font-medium text-[#416A59]"><ArrowUpRight className="size-3" />{recent.length} this month</span></div>
            <div className="grid h-[150px] grid-cols-6 items-end gap-3 border-b border-slate-100 pb-2">
              {months.map((month) => <div key={month.label} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-[10px] tabular-nums text-slate-400">{month.count || ""}</span><div className="w-full max-w-12 rounded-t-md bg-[#8EAB9A] transition-all" style={{ height: `${Math.max(4, (month.count / maxMonth) * 104)}px` }} /><span className="text-[10px] text-slate-400">{month.label}</span></div>)}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Based on account creation dates. This chart reflects studio sign-ups, not subscription revenue.</p>
          </div>
        </SectionCard>

        <SectionCard className="!p-0 overflow-hidden" title="Platform snapshot" description="Account status and current plan mix.">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-[#F6F8F6] px-3.5 py-3"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-white text-[#416A59]"><CheckCircle2 className="size-4" /></span><span className="text-sm text-slate-700">Active access</span></div><span className="text-lg font-semibold tabular-nums">{activeCount}</span></div>
            <div className="flex items-center justify-between rounded-lg bg-red-50/70 px-3.5 py-3"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-white text-red-600"><Ban className="size-4" /></span><span className="text-sm text-slate-700">Suspended access</span></div><span className="text-lg font-semibold tabular-nums">{suspendedCount}</span></div>
            <div className="border-t border-slate-100 pt-3"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[.12em] text-slate-400">Plan distribution</p><div className="space-y-3">{Object.entries(plans).length ? Object.entries(plans).sort((a, b) => b[1] - a[1]).map(([plan, count]) => <div key={plan}><div className="mb-1.5 flex justify-between text-xs"><span className="capitalize text-slate-600">{plan}</span><span className="tabular-nums text-slate-500">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#8EAB9A]" style={{ width: `${shops.length ? (count / shops.length) * 100 : 0}%` }} /></div></div>) : <p className="text-xs text-slate-400">No plan data available.</p>}</div></div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard className="!p-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Needs attention</h2><p className="mt-1 text-xs text-slate-500">Useful follow-ups based on studio account records.</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">{suspendedCount + incompleteOwners.length + onboarding.length} signals</span></div>
          <div className="divide-y divide-slate-100">
            {alerts.length ? alerts.map((alert) => <div key={`${alert.id}-${alert.title}`} className="flex items-center gap-3 px-5 py-3.5"><span className={`size-2 shrink-0 rounded-full ${alert.tone === "red" ? "bg-red-500" : alert.tone === "amber" ? "bg-amber-500" : "bg-blue-500"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{alert.title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{alert.detail}</p></div><button onClick={() => onSelectStudio(alert.id)} className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#416A59] hover:bg-[#EEF4F0]">{alert.label}</button></div>) : <div className="px-5 py-8 text-center"><span className="mx-auto grid size-10 place-items-center rounded-full bg-[#EEF4F0] text-[#416A59]"><Check className="size-5" /></span><p className="mt-3 text-sm font-medium text-slate-700">All clear</p><p className="mt-1 text-xs text-slate-500">No studio follow-ups based on current records.</p></div>}
          </div>
          <button onClick={onStudios} className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-3 text-xs font-medium text-[#416A59] hover:bg-slate-50">Open studio directory<ArrowRight className="size-3.5" /></button>
        </SectionCard>

        <SectionCard className="!p-0 overflow-hidden">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Recently joined</h2><p className="mt-1 text-xs text-slate-500">Latest studio registrations</p></div><button onClick={onStudios} className="text-xs font-medium text-[#416A59] hover:underline">All studios</button></div>
          <div className="divide-y divide-slate-100">{shops.slice(0, 5).map((shop) => <button key={shop.id} onClick={() => onSelectStudio(shop.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF4F0] text-[#416A59]"><Building2 className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{shop.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{shop.ownerName || "Owner details missing"} · {formatDate(shop.createdAt)}</span></span><ChevronRight className="size-4 shrink-0 text-slate-300" /></button>)}{shops.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No studio accounts yet.</p>}</div>
          <button onClick={onFeatures} className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3.5 text-left hover:bg-slate-50"><span><span className="block text-xs font-medium text-slate-700">Feature availability</span><span className="mt-0.5 block text-[11px] text-slate-500">Configure menus across the platform</span></span><ArrowRight className="size-4 text-[#416A59]" /></button>
        </SectionCard>
      </div>
      <p className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400"><CircleHelp className="size-3.5" />Platform metrics are live counts from studio records; no billing or usage estimates are inferred.</p>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon, foot, loading, accent }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; foot: string; loading: boolean; accent: string }) {
  const iconTone: Record<string, string> = { green: "bg-[#EEF4F0] text-[#416A59]", blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p><span className={`grid size-9 place-items-center rounded-lg ${iconTone[accent]}`}><Icon className="size-4" /></span></div><p className="mt-3 font-display text-3xl font-semibold tabular-nums text-slate-900">{loading && value === 0 ? <span className="inline-block h-8 w-10 animate-pulse rounded bg-slate-100" /> : value.toLocaleString()}</p><p className="mt-2 truncate text-[11px] text-slate-400 sm:text-xs">{foot}</p></div>;
}

function StudioDirectory({ shops, allCount, query, setQuery, filter, setFilter, loading, onSelect }: { shops: ShopSummary[]; allCount: number; query: string; setQuery: (query: string) => void; filter: StudioFilter; setFilter: (filter: StudioFilter) => void; loading: boolean; onSelect: (id: string) => void }) {
  const filters: { id: StudioFilter; label: string }[] = [{ id: "all", label: "All studios" }, { id: "active", label: "Active" }, { id: "suspended", label: "Suspended" }, { id: "setup", label: "Onboarding follow-up" }];
  return <SectionCard className="!p-0 overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Studio directory</h2><p className="mt-1 text-xs text-slate-500">{shops.length} shown · {allCount} total studios</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF4F0] px-2.5 py-1 text-[11px] font-medium text-[#416A59]"><Activity className="size-3.5" />Live account data</span></div><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search studio, owner or email…" aria-label="Search studios" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#527564] focus:ring-4 focus:ring-[#527564]/10" /></div><div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">{filters.map((item) => <button key={item.id} onClick={() => setFilter(item.id)} className={`shrink-0 rounded-md px-3 py-1.5 text-xs transition ${filter === item.id ? "bg-white font-medium text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{item.label}</button>)}</div></div></div>
    <div className="hidden grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_90px_90px_100px_100px] gap-3 bg-slate-50/70 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400 lg:grid"><span>Studio / owner</span><span>Plan</span><span>Members</span><span>Orders</span><span>Created</span><span>Status</span></div>
    {loading && shops.length === 0 ? <div className="grid min-h-48 place-items-center"><Loader2 className="size-5 animate-spin text-[#416A59]" /></div> : shops.length === 0 ? <div className="px-5 py-14 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400"><SlidersHorizontal className="size-5" /></span><p className="mt-3 text-sm font-medium text-slate-700">No studios found</p><p className="mt-1 text-xs text-slate-500">Try another search or account filter.</p></div> : <div className="divide-y divide-slate-100">{shops.map((shop) => <button key={shop.id} onClick={() => onSelect(shop.id)} className="grid w-full grid-cols-1 items-center gap-2 px-4 py-3.5 text-left transition hover:bg-[#FAFBFA] sm:px-5 lg:grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_90px_90px_100px_100px] lg:gap-3">
      <span className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF4F0] text-[#416A59]"><Building2 className="size-4" /></span><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate text-sm font-medium text-slate-800">{shop.name}</span><span className="lg:hidden"><StatusPill suspended={Boolean(shop.suspendedAt)} /></span></span><span className="mt-0.5 block truncate text-xs text-slate-500">{shop.ownerName || "Owner not set"} · {shop.ownerEmail || shop.slug}</span></span></span>
      <span className="flex items-center justify-between text-xs text-slate-600 lg:block"><span className="text-slate-400 lg:hidden">Plan</span><span className="capitalize">{shop.plan || "Unassigned"}</span></span><span className="flex items-center justify-between text-xs tabular-nums text-slate-600 lg:block"><span className="text-slate-400 lg:hidden">Members</span>{shop.userCount}</span><span className="flex items-center justify-between text-xs tabular-nums text-slate-600 lg:block"><span className="text-slate-400 lg:hidden">Orders</span>{shop.orderCount}</span><span className="flex items-center justify-between text-xs text-slate-600 lg:block"><span className="text-slate-400 lg:hidden">Created</span>{formatDate(shop.createdAt)}</span><span className="hidden lg:block"><StatusPill suspended={Boolean(shop.suspendedAt)} /></span>
    </button>)}</div>}
  </SectionCard>;
}

function StatusPill({ suspended }: { suspended: boolean }) { return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${suspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}><span className={`size-1.5 rounded-full ${suspended ? "bg-red-500" : "bg-emerald-500"}`} />{suspended ? "Suspended" : "Active"}</span>; }

interface MenuSetting { key: MenuKey; label: string; section: string; enabled: boolean }
function MenuManagement() {
  const [menus, setMenus] = useState<MenuSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<MenuKey | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    apiGet<MenuSetting[]>("/api/admin/menus").then(setMenus).catch((err) => setError(apiErrorMessage(err, "Could not load feature settings."))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleMenu(menu: MenuSetting) {
    setSavingKey(menu.key); setError("");
    try {
      const updated = await apiPatch<{ key: MenuKey; enabled: boolean }>("/api/admin/menus", { key: menu.key, enabled: !menu.enabled });
      setMenus((items) => items.map((item) => item.key === updated.key ? { ...item, enabled: updated.enabled } : item));
    } catch (err) { setError(apiErrorMessage(err, "Could not update this feature.")); }
    finally { setSavingKey(null); }
  }
  const ordered = MENU_DEFINITIONS.map((definition) => menus.find((menu) => menu.key === definition.key)).filter((menu): menu is MenuSetting => Boolean(menu));
  const enabledCount = menus.filter((menu) => menu.enabled).length;
  const sections = [...new Set(ordered.map((menu) => menu.section))];

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Features available</p><p className="mt-2 font-display text-2xl font-semibold">{loading ? "—" : enabledCount}<span className="ml-1 text-sm font-normal text-slate-400">/ {menus.length}</span></p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Currently disabled</p><p className="mt-2 font-display text-2xl font-semibold">{loading ? "—" : menus.length - enabledCount}</p></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Scope</p><p className="mt-2 text-sm font-semibold text-slate-800">All studios</p><p className="mt-1 text-[11px] text-slate-400">Changes apply platform-wide.</p></div></div>
    <SectionCard className="!p-0 overflow-hidden" title="Platform features" description="Control which workspace menus are available to every studio. Changes apply immediately.">
      {error && <div role="alert" className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"><span className="flex items-center gap-2"><AlertCircle className="size-4 shrink-0" />{error}</span><button onClick={load} className="font-medium underline">Retry</button></div>}
      {loading ? <div className="grid min-h-48 place-items-center"><Loader2 className="size-5 animate-spin text-[#416A59]" /></div> : <div>{sections.map((section) => <div key={section}><div className="border-y border-slate-100 bg-slate-50/70 px-5 py-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400 first:border-t-0">{section}</div>{ordered.filter((menu) => menu.section === section).map((menu) => <div key={menu.key} className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-0"><div className={`grid size-9 shrink-0 place-items-center rounded-lg ${menu.enabled ? "bg-[#EEF4F0] text-[#416A59]" : "bg-slate-100 text-slate-400"}`}><ListChecks className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{menu.label}</p><p className="mt-0.5 text-xs text-slate-500">{menu.enabled ? "Available in studio workspaces" : "Hidden from studio workspaces"}</p></div><button type="button" role="switch" aria-checked={menu.enabled} aria-label={`${menu.enabled ? "Disable" : "Enable"} ${menu.label}`} disabled={savingKey !== null} onClick={() => void toggleMenu(menu)} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${menu.enabled ? "bg-[#416A59]" : "bg-slate-300"}`}><span className={`absolute top-0.5 grid size-5 place-items-center rounded-full bg-white shadow-sm transition-all ${menu.enabled ? "left-[22px]" : "left-0.5"}`}>{savingKey === menu.key ? <Loader2 className="size-3 animate-spin text-slate-500" /> : menu.enabled ? <Check className="size-3 text-[#416A59]" /> : null}</span></button><span className={`hidden w-[62px] text-right text-xs sm:block ${menu.enabled ? "text-[#416A59]" : "text-slate-400"}`}>{savingKey === menu.key ? "Saving…" : menu.enabled ? "Enabled" : "Disabled"}</span></div>)}</div>)}</div>}
      <div className="flex items-start gap-2.5 border-t border-slate-100 bg-[#FAFBFA] px-5 py-3.5 text-[11px] leading-relaxed text-slate-500"><CircleHelp className="mt-0.5 size-3.5 shrink-0 text-slate-400" />Disabling a feature hides its workspace navigation and blocks its associated APIs. Existing records remain stored.</div>
    </SectionCard>
  </div>;
}

function ShopDetailPanel({ shopId, onClose, onChanged }: { shopId: string; onClose: () => void; onChanged: () => void }) {
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("");
  const [currency, setCurrency] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true); setError("");
    apiGet<ShopDetail>(`/api/admin/shops/${shopId}`).then((detail) => { setShop(detail); setName(detail.name); setPlan(detail.plan); setCurrency(detail.currency); }).catch((err) => setError(apiErrorMessage(err, "Could not load studio details."))).finally(() => setLoading(false));
  }, [shopId]);
  useEffect(() => { load(); }, [load]);

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { const updated = await apiPatch<Partial<ShopDetail>>(`/api/admin/shops/${shopId}`, { name, plan, currency }); setShop((current) => current ? { ...current, ...updated } : current); onChanged(); }
    catch (err) { setError(apiErrorMessage(err, "Could not save studio changes.")); }
    finally { setSaving(false); }
  }
  async function toggleSuspend(suspend: boolean) {
    setSaving(true); setError("");
    try { const updated = await apiPatch<Partial<ShopDetail>>(`/api/admin/shops/${shopId}`, { suspended: suspend, suspendedReason: suspend ? suspendReason.trim() || undefined : undefined }); setShop((current) => current ? { ...current, ...updated } : current); setSuspendReason(""); onChanged(); }
    catch (err) { setError(apiErrorMessage(err, "Could not update studio access.")); }
    finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={shop?.name || "Studio details"} className="flex h-full w-full max-w-[560px] flex-col bg-[#F6F7F9] shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#527564]">Studio account</p><h2 className="mt-0.5 truncate font-display text-xl font-semibold text-slate-900">{shop?.name || (loading ? "Loading studio…" : "Studio details")}</h2></div><button onClick={onClose} aria-label="Close studio details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="size-4" /></button></div>
      {loading ? <div className="grid flex-1 place-items-center"><Loader2 className="size-5 animate-spin text-[#416A59]" /></div> : !shop ? <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || "Studio not found."}<button onClick={load} className="ml-2 underline">Retry</button></div> : <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"><AlertCircle className="size-4 shrink-0" />{error}</div>}
        <div className="grid grid-cols-3 gap-2"><MiniMetric label="Members" value={shop.members.length} icon={Users} /><MiniMetric label="Customers" value={shop.customerCount} icon={Users} /><MiniMetric label="Orders" value={shop.recentOrders.length} icon={Package} /></div>
        {shop.suspendedAt ? <div className="rounded-xl border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-red-800"><Ban className="size-4" />Access suspended</div><p className="mt-1 text-xs text-red-700">Since {formatDate(shop.suspendedAt)}{shop.suspendedReason ? ` · ${shop.suspendedReason}` : ""}</p><button disabled={saving} onClick={() => void toggleSuspend(false)} className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">Reinstate studio</button></div> : <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold text-slate-800">Suspend studio access</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Members will be signed out and unable to sign back in until the studio is reinstated.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={suspendReason} onChange={(event) => setSuspendReason(event.target.value)} placeholder="Reason (shown to the owner)" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-red-300" /><button disabled={saving} onClick={() => void toggleSuspend(true)} className="h-9 rounded-lg bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">Suspend studio</button></div></div>}
        {shop.latestPlanRequest && (
          <div className={`rounded-xl border p-4 ${shop.latestPlanRequest.status === "pending" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold capitalize text-slate-800">
                {shop.latestPlanRequest.requestedPlan} upgrade request
              </p>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${shop.latestPlanRequest.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                {shop.latestPlanRequest.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Submitted {formatDate(shop.latestPlanRequest.createdAt)}. Assign the requested plan below to approve, or another plan to decline.
            </p>
            {shop.latestPlanRequest.message && (
              <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs leading-relaxed text-slate-600">{shop.latestPlanRequest.message}</p>
            )}
          </div>
        )}
        <form onSubmit={saveDetails} className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-800">Studio settings</h3><div className="mt-3 space-y-3"><label className="block text-xs font-medium text-slate-500">Studio name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-[#527564]" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs font-medium text-slate-500">Plan<select value={plan} onChange={(event) => setPlan(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"><option value="trial">Trial</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></label><label className="block text-xs font-medium text-slate-500">Currency<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} pattern="[A-Za-z]{3}" title="Use a 3-letter currency code" className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase text-slate-800" /></label></div><div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="text-xs text-slate-400">Created {formatDate(shop.createdAt)} · /{shop.slug}</span><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#315B4A] px-3.5 text-xs font-medium text-white hover:bg-[#244638] disabled:opacity-50">{saving && <Loader2 className="size-3.5 animate-spin" />}Save changes</button></div></div></form>
        <SectionCard className="!p-0 overflow-hidden"><div className="border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-semibold text-slate-800">Studio members <span className="ml-1 font-normal text-slate-400">{shop.members.length}</span></h3></div>{shop.members.length ? <div className="divide-y divide-slate-100">{shop.members.map((member) => <div key={member.id} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(member.fullName)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{member.fullName || "Unnamed member"}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">{member.role}</span></div>)}</div> : <p className="px-4 py-6 text-center text-xs text-slate-500">No members found.</p>}</SectionCard>
        <SectionCard className="!p-0 overflow-hidden"><div className="border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-semibold text-slate-800">Recent orders <span className="ml-1 font-normal text-slate-400">· {shop.customerCount} customers</span></h3></div>{shop.recentOrders.length ? <div className="divide-y divide-slate-100">{shop.recentOrders.map((order) => <div key={order.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{order.garmentDesign || "Untitled order"}</p><p className="truncate text-xs text-slate-500">{order.customerName || "Customer not set"} · {formatDate(order.orderDate)}</p></div><div className="text-right"><p className="text-xs text-slate-500">{order.status}</p>{order.sellingPrice != null && <p className="mt-0.5 text-xs font-medium tabular-nums text-slate-700">{formatCurrency(order.sellingPrice, shop.currency)}</p>}</div></div>)}</div> : <p className="px-4 py-6 text-center text-xs text-slate-500">No orders recorded yet.</p>}</SectionCard>
      </div>}
    </section>
  </div>;
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) { return <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-1.5 text-[10px] text-slate-400"><Icon className="size-3.5" />{label}</div><p className="mt-1.5 font-display text-xl font-semibold tabular-nums text-slate-800">{value}</p></div>; }
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "SA"; }
