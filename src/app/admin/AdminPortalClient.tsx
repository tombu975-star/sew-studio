"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  LogOut,
  Loader2,
  AlertCircle,
  Building2,
  Users,
  Package,
  Ban,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/atelier/_portal";
import { apiGet, apiPost, apiPatch, apiErrorMessage } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/format";

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
      <div className="min-h-dvh flex items-center justify-center bg-[#FAFAF7]">
        <Loader2 className="w-6 h-6 animate-spin text-[#9E5A44]" />
      </div>
    );
  }

  if (!admin) return <AdminLogin onLoggedIn={setAdmin} />;

  return <AdminDashboard admin={admin} onLogout={() => setAdmin(null)} />;
}

function AdminLogin({ onLoggedIn }: { onLoggedIn: (a: AdminProfile) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiPost<{ admin: AdminProfile }>("/api/admin-auth/login", {
        email,
        password,
      });
      onLoggedIn(res.admin);
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#FAFAF7] px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1C1A18] to-[#3a3632] flex items-center justify-center text-white shadow-sm mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="font-display font-semibold text-[#1C1A18] text-2xl">
            Platform admin
          </h1>
          <p className="text-sm text-stone-500 mt-1 text-center">
            Manage every studio on Madam Studio.
          </p>
        </div>

        <SectionCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[#E7E5E4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9E5A44]/20"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[#E7E5E4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9E5A44]/20"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-[#1C1A18] hover:bg-[#3a3632] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function AdminDashboard({ admin, onLogout }: { admin: AdminProfile; onLogout: () => void }) {
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    apiGet<ShopSummary[]>("/api/admin/shops")
      .then(setShops)
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  async function handleLogout() {
    await apiPost("/api/admin-auth/logout", {});
    onLogout();
  }

  const filtered = shops.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      (s.ownerEmail || "").toLowerCase().includes(q) ||
      (s.ownerName || "").toLowerCase().includes(q)
    );
  });

  const activeCount = shops.filter((s) => !s.suspendedAt).length;
  const suspendedCount = shops.length - activeCount;
  const totalMembers = shops.reduce((sum, s) => sum + s.userCount, 0);

  return (
    <div className="min-h-dvh bg-[#FAFAF7]">
      <div className="max-w-5xl mx-auto px-5 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-6">
          <PageHeader
            eyebrow="Platform Admin"
            title={`Hi, ${admin.fullName.split(" ")[0]}`}
            subtitle="Every studio on the platform, in one place."
          />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#9E5A44] transition-colors mt-1 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon={Building2} label="Studios" value={shops.length} />
          <StatCard icon={CheckCircle2} label="Active" value={activeCount} tone="good" />
          <StatCard icon={Ban} label="Suspended" value={suspendedCount} tone={suspendedCount ? "bad" : undefined} />
        </div>

        <SectionCard className="!p-0" title={`All studios · ${totalMembers} members total`}>
          <div className="px-5 py-3 border-b border-[#EAE6DF]/70">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search studios…"
                className="w-full h-8 pl-8 pr-3 rounded-md border border-[#E7E5E4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9E5A44]/20"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#9E5A44]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-stone-500 py-12">No studios match that search.</p>
          ) : (
            <div className="divide-y divide-[#EAE6DF]/70">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-[#FAFAF7] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#1C1A18] text-sm truncate">{s.name}</p>
                      {s.suspendedAt && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 truncate">
                      {s.ownerName || "No owner"} · {s.ownerEmail || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-500 shrink-0">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {s.userCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" /> {s.orderCount}
                    </span>
                    <span className="hidden sm:inline capitalize">{s.plan}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {selectedId && (
        <ShopDetailPanel
          shopId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "good" | "bad";
}) {
  return (
    <div className="bg-white border border-[#EAE6DF] rounded-lg p-4 elevate-sm">
      <div className="flex items-center gap-2 text-stone-400 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p
        className={`font-display font-semibold text-2xl tabular-nums ${
          tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-700" : "text-[#1C1A18]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ShopDetailPanel({
  shopId,
  onClose,
  onChanged,
}: {
  shopId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("");
  const [currency, setCurrency] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    apiGet<ShopDetail>(`/api/admin/shops/${shopId}`)
      .then((d) => {
        setShop(d);
        setName(d.name);
        setPlan(d.plan);
        setCurrency(d.currency);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [shopId]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await apiPatch<ShopDetail>(`/api/admin/shops/${shopId}`, {
        name,
        plan,
        currency,
      });
      setShop((s) => (s ? { ...s, ...updated } : s));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspend(suspend: boolean) {
    setSaving(true);
    setError("");
    try {
      const updated = await apiPatch<ShopDetail>(`/api/admin/shops/${shopId}`, {
        suspended: suspend,
        suspendedReason: suspend ? suspendReason.trim() || undefined : undefined,
      });
      setShop((s) => (s ? { ...s, ...updated } : s));
      setSuspendReason("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update suspension.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-[#FAFAF7] overflow-y-auto shadow-xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-[#EAE6DF] px-5 py-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-[#1C1A18] truncate">
            {shop?.name || "Loading…"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-black/5 shrink-0">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {loading || !shop ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#9E5A44]" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {shop.suspendedAt ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Suspended {formatDate(shop.suspendedAt)}
                </p>
                {shop.suspendedReason && (
                  <p className="text-sm text-red-700 mb-3">{shop.suspendedReason}</p>
                )}
                <button
                  onClick={() => toggleSuspend(false)}
                  disabled={saving}
                  className="h-9 px-3 rounded-md bg-white border border-red-300 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-60"
                >
                  Reinstate studio
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-[#EAE6DF] bg-white p-4">
                <p className="text-sm font-medium text-[#1C1A18] mb-2">Suspend this studio</p>
                <p className="text-xs text-stone-500 mb-3">
                  Every member is signed out immediately and can&apos;t log back in until reinstated.
                </p>
                <input
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason (shown to the owner)"
                  className="w-full h-9 px-3 mb-3 rounded-md border border-[#E7E5E4] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#9E5A44]/20"
                />
                <button
                  onClick={() => toggleSuspend(true)}
                  disabled={saving}
                  className="h-9 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
                >
                  Suspend studio
                </button>
              </div>
            )}

            <form onSubmit={saveDetails} className="rounded-md border border-[#EAE6DF] bg-white p-4 space-y-3">
              <p className="text-sm font-medium text-[#1C1A18]">Studio details</p>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1 block">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-[#E7E5E4] bg-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1 block">Plan</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-[#E7E5E4] bg-white text-sm"
                  >
                    <option value="trial">Trial</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-500 mb-1 block">Currency</label>
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                    className="w-full h-9 px-3 rounded-md border border-[#E7E5E4] bg-white text-sm uppercase"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 rounded-md bg-[#1C1A18] hover:bg-[#3a3632] text-white text-sm font-medium disabled:opacity-60"
              >
                Save changes
              </button>
            </form>

            <div className="rounded-md border border-[#EAE6DF] bg-white p-4">
              <p className="text-sm font-medium text-[#1C1A18] mb-3">
                Members · {shop.members.length}
              </p>
              <div className="space-y-2">
                {shop.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="text-[#1C1A18] truncate">{m.fullName}</p>
                      <p className="text-xs text-stone-500 truncate">{m.email}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-stone-500 shrink-0 ml-2">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-[#EAE6DF] bg-white p-4">
              <p className="text-sm font-medium text-[#1C1A18] mb-3">
                Recent orders · {shop.customerCount} customers total
              </p>
              {shop.recentOrders.length === 0 ? (
                <p className="text-sm text-stone-500">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {shop.recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="text-[#1C1A18] truncate">{o.garmentDesign}</p>
                        <p className="text-xs text-stone-500 truncate">{o.customerName || "—"}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs text-stone-500">{o.status}</p>
                        {o.sellingPrice != null && (
                          <p className="text-xs tabular-nums">{formatCurrency(o.sellingPrice, shop.currency)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
