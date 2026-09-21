import { db } from "@/lib/db";

/**
 * Create a customer-facing notification about an order event.
 * Used by the order/payment/fitting routes to alert the customer.
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
}) {
  try {
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
      },
    });
  } catch (err) {
    // Notifications are best-effort — never block the parent operation.
    console.error("[notifyCustomer]", err);
  }
}

/**
 * Generate (or regenerate) a portal token for a customer.
 * Returns the token. The customer uses it to access /portal?token=...
 */
export async function ensurePortalToken(customerId: string): Promise<string> {
  const existing = await db.customer.findUnique({
    where: { id: customerId },
    select: { portalToken: true },
  });
  if (existing?.portalToken) return existing.portalToken;
  // Generate a URL-safe token.
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
  from: string,
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
