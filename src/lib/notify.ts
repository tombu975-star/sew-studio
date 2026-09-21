import { db } from "@/lib/db";

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
 */
export async function notifyCustomer(opts: {
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
}) {
  try {
    // Fetch the customer to detect the channel (unless explicitly provided).
    const customer = await db.customer.findUnique({
      where: { id: opts.customerId },
      select: { id: true, whatsapp: true, phone: true, email: true },
    });
    const detected = opts.channel
      ? { channel: opts.channel, recipient: "" }
      : detectChannel(customer || { id: opts.customerId });
    // Resolve recipient for explicit channel.
    let recipient = detected.recipient;
    if (opts.channel && customer) {
      if (opts.channel === "whatsapp") recipient = customer.whatsapp || "";
      else if (opts.channel === "sms") recipient = customer.phone || "";
      else if (opts.channel === "email") recipient = customer.email || "";
    }

    await db.customerNotification.create({
      data: {
        shopId: opts.shopId,
        customerId: opts.customerId,
        orderId: opts.orderId || null,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        statusFrom: opts.statusFrom || null,
        statusTo: opts.statusTo || null,
        direction: opts.direction || "auto",
        channel: detected.channel,
        recipient: recipient || null,
        deliveryStatus: "sent",
        sentAt: new Date(),
      },
    });
  } catch (err) {
    // Notifications are best-effort — never block the parent operation.
    console.error("[notifyCustomer]", err);
  }
}

/**
 * Generate (or regenerate) a portal token for a customer.
 */
export async function ensurePortalToken(customerId: string): Promise<string> {
  const existing = await db.customer.findUnique({
    where: { id: customerId },
    select: { portalToken: true },
  });
  if (existing?.portalToken) return existing.portalToken;
  const token =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10);
  await db.customer.update({
    where: { id: customerId },
    data: { portalToken: token },
  });
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
