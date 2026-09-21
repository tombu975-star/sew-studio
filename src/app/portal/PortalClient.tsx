"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Scissors,
  CheckCircle2,
  Clock,
  CreditCard,
  CalendarDays,
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Bell,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { StatusStepper } from "@/components/atelier/StatusStepper";
import { PageHeader, SectionCard } from "@/components/atelier/_portal";
import { formatCurrency, formatDate, shortDate, ORDER_STATUSES } from "@/lib/format";
import type { Order } from "@/lib/types";

interface PortalData {
  customer: { id: string; name: string; phone?: string | null; email?: string | null };
  shop: { id: string; name: string; currency: string };
  orders: Order[];
}
interface PortalNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  statusFrom?: string | null;
  statusTo?: string | null;
  readAt?: string | null;
  createdAt: string;
  order?: { id: string; garmentDesign: string } | null;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const NOTIF_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  status_change: CheckCircle2,
  payment_received: CreditCard,
  fitting_scheduled: CalendarDays,
  fitting_completed: CheckCircle2,
  ready_for_collection: Sparkles,
  delivered: CheckCircle2,
  message: MessageSquare,
};

export function PortalClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [data, setData] = useState<PortalData | null>(null);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/portal/${token}`).then((r) => r.json()),
      fetch(`/api/portal/${token}/notifications`).then((r) => r.json()),
    ])
      .then(([d, n]) => {
        if (cancelled) return;
        if (d.error) {
          setError(d.error);
          setData(null);
        } else {
          setData(d);
          setError("");
          if (d.orders?.length) setExpandedOrder(d.orders[0].id);
        }
        setNotifications(Array.isArray(n) ? n : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
        // Mark notifications as read after a short delay.
        setTimeout(() => {
          fetch(`/api/portal/${token}/notifications`, { method: "PATCH" }).catch(() => {});
        }, 1500);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications]
  );

  // ─── No token: show the entry screen ───────────────────────────
  if (!token && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#faf8f5]">
        <div className="relative h-[38vh] min-h-[260px] overflow-hidden bg-[#800020]">
          <img src="/atelier-login.jpg" alt="Atelier" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#800020]/85 via-[#6b0018]/65 to-[#1C1917]/80" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#faf8f5]" />
          <div className="relative h-full flex flex-col items-center justify-center text-white px-6 text-center">
            <div className="w-14 h-14 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-sm bg-white/5 animate-fade-in-up">
              <Scissors className="w-6 h-6" />
            </div>
            <h1 className="font-display font-semibold mt-4 animate-fade-in-up" style={{ fontSize: "clamp(28px, 6vw, 38px)" }}>
              Track your order
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 mt-2 animate-fade-in-up">
              Madam Studio · Client Portal
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center px-6 pt-2 pb-10 -mt-6 relative z-10">
          <div className="w-full max-w-md animate-fade-in-up">
            <div className="mb-6">
              <h2 className="font-display font-semibold text-[#1C1917] leading-tight" style={{ fontSize: "clamp(24px, 5vw, 30px)" }}>
                Enter your tracking link
              </h2>
              <p className="text-sm text-stone-500 mt-2">
                Paste the tracking code your studio sent you to see your order's journey and updates.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tokenInput.trim()) {
                  window.location.href = `/portal?token=${encodeURIComponent(tokenInput.trim())}`;
                }
              }}
              className="space-y-4"
            >
              <input
                type="text"
                required
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. a1b2c3d4e5f6..."
                className="w-full h-12 bg-white border border-[#E7E5E4] rounded-xl px-4 text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:border-[#800020] focus:ring-4 focus:ring-[#800020]/8 transition-all elevate-sm"
              />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-5 bg-[#800020] text-white text-sm font-medium rounded-xl hover:bg-[#6b0018] transition-all elevate-burgundy hover:translate-y-[-1px] group"
              >
                Track my order
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </button>
            </form>
            <p className="text-center text-[11px] text-stone-400 mt-8 leading-relaxed">
              Don't have a link? Ask the studio to send you your order tracking link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8f5] gap-4">
        <div className="w-12 h-12 rounded-full border border-[#800020] flex items-center justify-center">
          <Scissors className="w-5 h-5 text-[#800020]" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-[#800020]" />
        <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">Loading your orders…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8f5] gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#800020]/8 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-[#800020]" />
        </div>
        <p className="font-display text-xl font-semibold text-[#1C1917]">Link not found</p>
        <p className="text-sm text-stone-500 max-w-xs">
          {error || "This tracking link is invalid or has expired."}
        </p>
        <a href="/portal" className="mt-2 inline-flex items-center gap-2 text-sm text-[#800020] font-medium hover:underline">
          <ArrowRight className="w-4 h-4 rotate-180" /> Try a different link
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header band */}
      <div className="relative overflow-hidden bg-[#800020]">
        <img src="/atelier-login.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#800020]/90 to-[#1C1917]/85" />
        <div className="relative px-6 py-10 md:py-14 max-w-3xl mx-auto text-white">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center backdrop-blur-sm bg-white/5">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="font-display text-lg font-semibold">{data.shop.name}</span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/55 mb-2">Client Portal</p>
          <h1 className="font-display font-semibold leading-tight" style={{ fontSize: "clamp(28px, 5vw, 38px)" }}>
            Hello, {data.customer.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-white/70 mt-2">
            Here's the latest on your orders. We'll alert you here whenever there's an update.
          </p>
          {unreadCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium">
              <Bell className="w-3.5 h-3.5" />
              {unreadCount} new update{unreadCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 md:px-6 py-8 space-y-6">
        {/* Notifications timeline */}
        {notifications.length > 0 && (
          <SectionCard title="Latest updates">
            <div className="space-y-3">
              {notifications.slice(0, 8).map((n) => {
                const Icon = NOTIF_ICON[n.type] || Bell;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3 rounded-lg border transition-all ${
                      !n.readAt
                        ? "bg-[#800020]/4 border-[#800020]/15"
                        : "bg-white border-[#E7E5E4]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#800020]/8 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#800020]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[#1C1917]">{n.title}</p>
                        <span className="text-[10px] text-stone-400 shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{n.body}</p>
                      {n.order && (
                        <p className="text-[10px] text-stone-400 mt-1 truncate">→ {n.order.garmentDesign}</p>
                      )}
                    </div>
                    {!n.readAt && <span className="w-2 h-2 rounded-full bg-[#800020] shrink-0 mt-1.5" />}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Orders */}
        <SectionCard title={`Your orders · ${data.orders.length}`}>
          {data.orders.length === 0 ? (
            <p className="text-sm text-stone-400 py-8 text-center">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.orders.map((order) => {
                const expanded = expandedOrder === order.id;
                const paid = order.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                return (
                  <div key={order.id} className="rounded-lg border border-[#E7E5E4] overflow-hidden">
                    <button
                      onClick={() => setExpandedOrder(expanded ? null : order.id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-[#faf8f5] transition text-left"
                    >
                      {order.designImage ? (
                        <img src={order.designImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#faf8f5] border border-[#E7E5E4] flex items-center justify-center shrink-0">
                          <Scissors className="w-5 h-5 text-stone-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1C1917] truncate">{order.garmentDesign}</p>
                        <p className="text-xs text-stone-400 mt-0.5">Ordered {shortDate(order.orderDate)}</p>
                        <div className="mt-2"><StatusBadge status={order.status} /></div>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-stone-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
                    </button>

                    {expanded && (
                      <div className="border-t border-[#E7E5E4] p-4 space-y-5 animate-fade-in-up">
                        {/* Status stepper */}
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-3">Order journey</p>
                          <StatusStepper current={order.status} />
                        </div>

                        {/* Delivery + payment summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">Delivery date</p>
                            <p className="text-sm text-[#1C1917] font-medium">{formatDate(order.deliveryDate)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">Payment</p>
                            <p className="text-sm text-[#1C1917] font-medium tabular-nums">
                              {formatCurrency(paid)} <span className="text-stone-400">of {formatCurrency(order.sellingPrice)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Payments */}
                        {order.payments && order.payments.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-2">Payments</p>
                            <div className="space-y-1.5">
                              {order.payments.map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-xs">
                                  <span className="text-stone-600">{formatDate(p.date)}{p.method ? ` · ${p.method}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                                  <span className="text-[#1C1917] font-medium tabular-nums">{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fittings */}
                        {order.fittings && order.fittings.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-2">Fittings</p>
                            <div className="space-y-1.5">
                              {order.fittings.map((f) => (
                                <div key={f.id} className="flex items-center justify-between text-xs">
                                  <span className="text-stone-600">{formatDate(f.date)}</span>
                                  <StatusBadge status={f.status} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Contact studio */}
        <SectionCard title="Need help?">
          <div className="flex flex-wrap gap-3">
            {data.customer.phone && (
              <a href={`tel:${data.customer.phone}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E7E5E4] bg-white text-sm text-[#1C1917] hover:border-[#800020]/30 transition elevate-sm">
                <Phone className="w-4 h-4 text-[#800020]" /> Call the studio
              </a>
            )}
            {data.customer.email && (
              <a href="mailto:studio" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E7E5E4] bg-white text-sm text-[#1C1917] hover:border-[#800020]/30 transition elevate-sm">
                <Mail className="w-4 h-4 text-[#800020]" /> Email us
              </a>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-3">
            Save this page — it's your personal order tracker. Bookmark it to check back anytime.
          </p>
        </SectionCard>

        <p className="text-center text-[11px] text-stone-400 pt-2 pb-6">
          {data.shop.name} · Client Portal
        </p>
      </div>
    </div>
  );
}
