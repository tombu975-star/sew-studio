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
 * Delivers a notification through a deployed Google Apps Script Web App
 * (Extensions → Apps Script → Deploy → Web app, in the studio's own Google
 * account) — see docs/google-apps-script-notifications.md for the
 * ready-to-paste script and setup steps. Apps Script is responsible for
 * actually reaching the customer (Gmail for email; for WhatsApp/SMS it
 * calls out to whatever provider the script is wired to) and for logging
 * every attempt to a Sheet.
 *
 * Returns `null` (not attempted — e.g. no URL configured, or an in-app-only
 * notification) or `true`/`false` for attempted-and-{succeeded,failed}, so
 * the caller can record an accurate deliveryStatus either way.
 */
async function sendViaGoogleAppsScript(payload: {
  shopId: string;
  channel: "whatsapp" | "sms" | "email" | "in_app";
  recipient: string;
  title: string;
  body: string;
  type: string;
  customerName?: string | null;
}): Promise<boolean | null> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!url || payload.channel === "in_app" || !payload.recipient) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.GOOGLE_APPS_SCRIPT_SECRET || "",
        ...payload,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.error("[notifyCustomer] Apps Script webhook returned", res.status);
      return false;
    }
    const json = await res.json().catch(() => null);
    // The example script returns { ok: true }; treat a missing/malformed
    // body as failure rather than silently assuming success.
    return json?.ok === true;
  } catch (err) {
    console.error("[notifyCustomer] Apps Script webhook failed", err);
    return false;
  }
}

/**
 * Create a customer-facing notification about an order event AND attempt to
 * deliver it to the customer's preferred channel (WhatsApp/SMS/email) via a
 * Google Apps Script Web App — see sendViaGoogleAppsScript() above. Always
 * writes the audit row in customer_notifications regardless of delivery
 * outcome, with deliveryStatus reflecting what actually happened:
 *   - "sent"        — Apps Script confirmed delivery
 *   - "failed"      — Apps Script was configured but the call failed/errored
 *   - "logged_only" — no GOOGLE_APPS_SCRIPT_URL configured, or channel is
 *                     in-app-only; nothing external was attempted
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
      .select("id, name, whatsapp, phone, email")
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

    const delivered = await sendViaGoogleAppsScript({
      shopId: opts.shopId,
      channel: detected.channel,
      recipient,
      title: opts.title,
      body: opts.body,
      type: opts.type,
      customerName: customer?.name,
    });
    const deliveryStatus =
      delivered === null ? "logged_only" : delivered ? "sent" : "failed";

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
      delivery_status: deliveryStatus,
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
