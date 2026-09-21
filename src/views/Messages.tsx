"use client";

/**
 * Messages — studio outbox of every update sent to customers (auto + manual).
 *
 * Owner / trainer only (nav gates). Pulls GET /api/messages for the timeline,
 * GET /api/customers + /api/orders for the send-message dialog, and POSTs a
 * new manual message to /api/customers/[id]/send-message.
 *
 * Premium primitives: PageHeader, SectionCard, PremiumMetric, AnimatedNumber,
 * EmptyState + SkeletonList, PremiumButton, StatusBadge.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  MessageCircle,
  Smartphone,
  Mail,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/atelier/PageHeader";
import { SectionCard } from "@/components/atelier/SectionCard";
import { PremiumMetric } from "@/components/atelier/PremiumMetric";
import { AnimatedNumber } from "@/components/atelier/AnimatedNumber";
import {
  EmptyState,
  SkeletonList,
} from "@/components/atelier/EmptyState";
import { StatusBadge } from "@/components/atelier/StatusBadge";
import { PremiumButton } from "@/components/atelier/PremiumButton";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { apiGet, apiPost } from "@/lib/api";
import { shortDate } from "@/lib/format";
import type { Customer, Order } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
}

interface MessageOrder {
  id: string;
  garmentDesign: string;
}

interface CustomerNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  direction: string; // auto | manual
  channel: string; // whatsapp | sms | email | in_app
  recipient?: string | null;
  deliveryStatus: string; // sent | delivered | failed
  sentAt: string;
  createdAt: string;
  customer?: MessageCustomer | null;
  order?: MessageOrder | null;
}

// ---------------------------------------------------------------------------
// Channel + direction metadata (mirror the portal styling)
// ---------------------------------------------------------------------------

interface ChannelMeta {
  label: string;
  icon: LucideIcon;
  badge: string; // badge classes (bg + text + border)
  dot: string; // dot color
}

const CHANNEL_META: Record<string, ChannelMeta> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  sms: {
    label: "SMS",
    icon: Smartphone,
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  email: {
    label: "Email",
    icon: Mail,
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  in_app: {
    label: "In-app",
    icon: Bell,
    badge: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400",
  },
};

const CHANNEL_FALLBACK: ChannelMeta = {
  label: "In-app",
  icon: Bell,
  badge: "bg-stone-100 text-stone-600 border-stone-200",
  dot: "bg-stone-400",
};

const CHANNEL_FILTER_OPTIONS = [
  { value: "all", label: "All channels" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "in_app", label: "In-app" },
] as const;

const CHANNEL_SEND_OPTIONS = [
  { value: "auto-detect", label: "Auto-detect (preferred)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "in_app", label: "In-app" },
] as const;

const DIRECTION_META: Record<
  string,
  { label: string; class: string }
> = {
  auto: {
    label: "Auto",
    class: "bg-stone-100 text-stone-500 border-stone-200",
  },
  manual: {
    label: "Manual",
    class: "bg-[#800020]/8 text-[#800020] border-[#800020]/20",
  },
};

const DELIVERY_META: Record<
  string,
  { label: string; class: string }
> = {
  sent: {
    label: "Sent",
    class: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  delivered: {
    label: "Delivered",
    class: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    class: "bg-red-50 text-red-700 border-red-200",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  return shortDate(iso);
}

function gradientInitial(name?: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function Messages() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [customerQuery, setCustomerQuery] = useState<string>("");

  const { data: messages = [], isLoading } = useQuery<CustomerNotification[]>({
    queryKey: ["messages"],
    queryFn: () => apiGet<CustomerNotification[]>("/api/messages"),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => apiGet<Customer[]>("/api/customers"),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => apiGet<Order[]>("/api/orders"),
  });

  // ----- Stats -------------------------------------------------------------
  const stats = useMemo(() => {
    const total = messages.length;
    const auto = messages.filter((m) => m.direction === "auto").length;
    const manual = messages.filter((m) => m.direction === "manual").length;
    const whatsapp = messages.filter((m) => m.channel === "whatsapp").length;
    return { total, auto, manual, whatsapp };
  }, [messages]);

  // ----- Filters -----------------------------------------------------------
  const filtered = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    return messages.filter((m) => {
      if (channelFilter !== "all" && m.channel !== channelFilter) return false;
      if (q) {
        const name = (m.customer?.name || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [messages, channelFilter, customerQuery]);

  // ----- Send mutation -----------------------------------------------------
  const sendMutation = useMutation({
    mutationFn: (payload: {
      customerId: string;
      title?: string;
      body: string;
      channel?: string;
      orderId?: string;
    }) =>
      apiPost<CustomerNotification>(
        `/api/customers/${payload.customerId}/send-message`,
        {
          title: payload.title,
          body: payload.body,
          channel: payload.channel,
          orderId: payload.orderId || undefined,
        }
      ),
    onSuccess: (msg) => {
      toast.success("Message sent", {
        description: msg.recipient
          ? `Delivered via ${CHANNEL_META[msg.channel]?.label || msg.channel} to ${msg.recipient}`
          : "Added to the customer's timeline",
      });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSend = (payload: {
    customerId: string;
    title?: string;
    body: string;
    channel?: string;
    orderId?: string;
  }) => {
    sendMutation.mutate(payload);
  };

  return (
    <div className="p-5 md:p-8 max-w-[1200px] mx-auto w-full">
      <PageHeader
        eyebrow="Customer communications"
        eyebrowIcon={Send}
        title="Messages"
        subtitle="Every update sent to your clients — automatically and manually."
        actions={
          <PremiumButton onClick={() => setDialogOpen(true)}>
            <Send className="w-4 h-4" />
            Send new message
          </PremiumButton>
        }
      />

      {/* Premium stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PremiumMetric
          label="Total sent"
          value={<AnimatedNumber value={stats.total} />}
          icon={Send}
          accent
        />
        <PremiumMetric
          label="Auto"
          value={<AnimatedNumber value={stats.auto} />}
          icon={Sparkles}
        />
        <PremiumMetric
          label="Manual"
          value={<AnimatedNumber value={stats.manual} />}
          icon={Send}
        />
        <PremiumMetric
          label="WhatsApp"
          value={<AnimatedNumber value={stats.whatsapp} />}
          icon={MessageCircle}
        />
      </div>

      {/* Filter row */}
      <SectionCard className="mb-6" bodyClassName="py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 hidden sm:inline">
              Filter
            </span>
          </div>
          <div className="w-full sm:w-48">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full bg-white h-9">
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <Input
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search by customer name…"
              className="pl-9 h-9 bg-white"
            />
          </div>
          {filtered.length !== messages.length && (
            <span className="text-[11px] text-stone-400 shrink-0 tabular-nums">
              {filtered.length} of {messages.length}
            </span>
          )}
        </div>
      </SectionCard>

      {/* Messages list */}
      <SectionCard bodyClassName="p-0">
        {isLoading ? (
          <SkeletonList rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No messages sent yet."
            description="Manual messages and automatic customer notifications will appear here in your outbox."
          />
        ) : (
          <ul className="divide-y divide-[#E7E5E4]/70">
            {filtered.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
          </ul>
        )}
      </SectionCard>

      <SendMessageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customers={customers}
        orders={orders}
        submitting={sendMutation.isPending}
        onSend={handleSend}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message row
// ---------------------------------------------------------------------------

function MessageRow({ message }: { message: CustomerNotification }) {
  const channel = CHANNEL_META[message.channel] || CHANNEL_FALLBACK;
  const ChannelIcon = channel.icon;
  const direction = DIRECTION_META[message.direction] || DIRECTION_META.auto;
  const delivery = DELIVERY_META[message.deliveryStatus] || DELIVERY_META.sent;
  const initial = gradientInitial(message.customer?.name);
  const failed = message.deliveryStatus === "failed";

  return (
    <li className="group px-5 py-4 hover:bg-[#FBF9F7]/60 transition-colors">
      <div className="flex items-start gap-4">
        {/* Channel icon tile */}
        <div
          className={cn(
            "w-10 h-10 rounded-full border flex items-center justify-center shrink-0",
            channel.badge
          )}
        >
          <ChannelIcon className="w-4 h-4" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Top row: badges + time */}
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border rounded-md",
                channel.badge
              )}
            >
              <ChannelIcon className="w-3 h-3" />
              {channel.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border rounded-md",
                direction.class
              )}
            >
              {direction.label}
            </span>
            {message.recipient && (
              <span className="text-[11px] text-stone-500 tabular-nums truncate">
                {message.recipient}
              </span>
            )}
            <span className="ml-auto text-[11px] text-stone-400 shrink-0 tabular-nums">
              {timeAgo(message.sentAt || message.createdAt)}
            </span>
          </div>

          {/* Title + body */}
          <p className="text-sm font-medium text-[#1C1917] leading-snug">
            {message.title || "Untitled message"}
          </p>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed whitespace-pre-wrap line-clamp-2">
            {message.body}
          </p>

          {/* Bottom row: customer + order + delivery */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2.5">
            {message.customer && (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#800020] to-[#6b0018] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                  {initial}
                </span>
                <span className="text-[11px] text-stone-600 truncate">
                  {message.customer.name}
                </span>
              </span>
            )}
            {message.order && (
              <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 truncate min-w-0">
                <span className="text-stone-300">·</span>
                <span className="truncate">{message.order.garmentDesign}</span>
              </span>
            )}
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border rounded-md",
                delivery.class,
                failed && "ring-1 ring-red-200"
              )}
            >
              {failed ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {delivery.label}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Send message dialog
// ---------------------------------------------------------------------------

interface SendPayload {
  customerId: string;
  title?: string;
  body: string;
  channel?: string;
  orderId?: string;
}

function SendMessageDialog({
  open,
  onOpenChange,
  customers,
  orders,
  submitting,
  onSend,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customers: Customer[];
  orders: Order[];
  submitting: boolean;
  onSend: (payload: SendPayload) => void;
}) {
  const [customerId, setCustomerId] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("none");
  const [channel, setChannel] = useState<string>("auto-detect");
  const [title, setTitle] = useState<string>("Message from the studio");
  const [body, setBody] = useState<string>("");

  const reset = () => {
    setCustomerId("");
    setOrderId("none");
    setChannel("auto-detect");
    setTitle("Message from the studio");
    setBody("");
  };

  // Orders belonging to the chosen customer (for the optional Order select).
  const customerOrders = useMemo(() => {
    if (!customerId) return [];
    return orders.filter((o) => o.customerId === customerId);
  }, [orders, customerId]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    setOrderId("none"); // reset order when customer changes
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error("Please choose a customer");
      return;
    }
    if (!body.trim()) {
      toast.error("Message body is required");
      return;
    }
    onSend({
      customerId,
      title: title.trim() || undefined,
      body: body.trim(),
      channel: channel === "auto-detect" ? undefined : channel,
      orderId: orderId && orderId !== "none" ? orderId : undefined,
    });
  };

  const selectedCustomer = customers.find((c) => c.id === customerId) || null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTimeout(reset, 150);
      }}
    >
      <DialogContent className="sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-[#1C1917] flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#800020]/10 text-[#800020] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </span>
            Send new message
          </DialogTitle>
          <DialogDescription>
            Choose a customer, write your message, and the studio will route it
            to their preferred channel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Customer */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-customer">
              Customer <span className="text-[#800020]">*</span>
            </Label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger id="msg-customer" className="w-full bg-white">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {customers.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No customers yet
                  </SelectItem>
                ) : (
                  customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedCustomer && (
              <p className="text-[10px] text-stone-400 leading-relaxed">
                {[
                  selectedCustomer.whatsapp &&
                    `WhatsApp ${selectedCustomer.whatsapp}`,
                  selectedCustomer.phone && `Phone ${selectedCustomer.phone}`,
                  selectedCustomer.email && `Email ${selectedCustomer.email}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No contact details on file"}
              </p>
            )}
          </div>

          {/* Order (optional, filtered to customer) */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-order">
              Linked order{" "}
              <span className="text-[10px] font-normal text-stone-400">
                (optional)
              </span>
            </Label>
            <Select
              value={orderId}
              onValueChange={setOrderId}
              disabled={!customerId}
            >
              <SelectTrigger id="msg-order" className="w-full bg-white">
                <SelectValue
                  placeholder={
                    customerId
                      ? "No linked order"
                      : "Select a customer first"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">No linked order</SelectItem>
                {customerOrders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.garmentDesign} · {o.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Channel */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-channel">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger id="msg-channel" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_SEND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-stone-400">
              Auto-detect picks WhatsApp → SMS → email → in-app based on the
              customer&apos;s contact details.
            </p>
          </div>

          {/* Title */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-title">Title</Label>
            <Input
              id="msg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Message from the studio"
            />
          </div>

          {/* Body */}
          <div className="grid gap-1.5">
            <Label htmlFor="msg-body">
              Message <span className="text-[#800020]">*</span>
            </Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message to the customer…"
              rows={4}
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <PremiumButton
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </PremiumButton>
            <PremiumButton
              type="submit"
              loading={submitting}
              disabled={!customerId || !body.trim()}
            >
              <Send className="w-4 h-4" />
              Send message
            </PremiumButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
