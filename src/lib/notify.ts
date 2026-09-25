import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

interface CustomerContact {
  id: string;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Detect the best channel to reach a customer.
 * Priority: WhatsApp > SMS > Email > in-app.
 */
export function detectChannel(customer: CustomerContact): {
  channel: "whatsapp" | "sms" | "email" | "in_app";
  recipient: string;
} {
  if (customer.whatsapp) return { channel: "whatsapp", recipient: customer.whatsapp };
  if (customer.phone) return { channel: "sms", recipient: customer.phone };
  if (customer.email) return { channel: "email", recipient: customer.email };
  return { channel: "in_app", recipient: "" };
}

/**
 * Create a customer-facing notification about an order event AND auto-send it
 * to the customer's preferred channel (WhatsApp/SMS/email/in-app).
 *
 * In production, wire this to Twilio (SMS/WhatsApp) + an email provider.
 * Here the send is logged with deliveryStatus="sent".
 *
 * Pass `ctx.supabase` from a shop-session route, or the admin client from a
 * token-authenticated portal route (the customer has no session of their own).
 */
export async function notifyCustomer(
  supabase: Client,
  opts: {
    shopId: string;
    customerId: string;
    orderId?: string;
    type:
      | "status_change"
      | "payment_received"
      | "fitting_scheduled"
      | "fitting_completed"
      | "message"
      | "ready_for_collection"
      | "delivered";
    title: string;
    body: string;
    statusFrom?: string;
    statusTo?: string;
    direction?: "auto" | "manual";
    channel?: "whatsapp" | "sms" | "email" | "in_app";
  }
) {
  try {
    const { data: customer } = await supabase
      .from("customers")
      .select("id, whatsapp, phone, email")
      .eq("id", opts.customerId)
      .maybeSingle();

    const detected = opts.channel
      ? { channel: opts.channel, recipient: "" }
      : detectChannel(customer || { id: opts.customerId });
    let recipient = detected.recipient;
    if (opts.channel && customer) {
      if (opts.channel === "whatsapp") recipient = customer.whatsapp || "";
      else if (opts.channel === "sms") recipient = customer.phone || "";
      else if (opts.channel === "email") recipient = customer.email || "";
    }

    await supabase.from("customer_notifications").insert({
      shop_id: opts.shopId,
      customer_id: opts.customerId,
      order_id: opts.orderId || null,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      status_from: opts.statusFrom || null,
      status_to: opts.statusTo || null,
      direction: opts.direction || "auto",
      channel: detected.channel,
      recipient: recipient || null,
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    // Notifications are best-effort — never block the parent operation.
    console.error("[notifyCustomer]", err);
  }
}

/** Generate (or return the existing) portal token for a customer. */
export async function ensurePortalToken(supabase: Client, customerId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("customers")
    .select("portal_token")
    .eq("id", customerId)
    .maybeSingle();
  if (existing?.portal_token) return existing.portal_token;

  const token =
    Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  await supabase.from("customers").update({ portal_token: token }).eq("id", customerId);
  return token;
}

/** Human-readable status-change message for a customer. */
export function statusChangeMessage(
  garment: string,
  _from: string,
  to: string
): { title: string; body: string } {
  const friendly: Record<string, string> = {
    Enquiry: "your enquiry was received",
    Quoted: "we sent you a quote",
    Consultation: "a consultation was booked",
    Confirmed: "your order was confirmed",
    "Deposit Paid": "we received your deposit",
    "In Production": "your garment is now in production",
    Fitting: "a fitting is underway",
    Alterations: "alterations are in progress",
    Ready: "your garment is ready for collection",
    "Collected/Delivered": "your garment was collected/delivered",
    Completed: "your order is complete",
  };
  const toFriendly = friendly[to] || `your order moved to ${to}`;
  return {
    title: "Order update",
    body: `Good news — ${toFriendly}. (${garment})`,
  };
}
