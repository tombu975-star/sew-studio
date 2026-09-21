import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { notifyCustomer, detectChannel } from "@/lib/notify";

// POST /api/customers/[id]/send-message — studio manually sends a message to a customer.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const { title, body: text, channel, orderId } = body || {};
    if (!text) {
      return Response.json(
        { error: "Message body is required." },
        { status: 400 }
      );
    }

    // Verify customer belongs to tenant.
    const customer = await db.customer.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true, whatsapp: true, phone: true, email: true },
    });
    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }

    // Resolve the channel (explicit > auto-detect).
    const resolved = channel
      ? {
          channel: channel as "whatsapp" | "sms" | "email" | "in_app",
          recipient:
            channel === "whatsapp"
              ? customer.whatsapp || ""
              : channel === "sms"
                ? customer.phone || ""
                : channel === "email"
                  ? customer.email || ""
                  : "",
        }
      : detectChannel(customer);

    const notification = await db.customerNotification.create({
      data: {
        shopId: ctx.shopId,
        customerId: id,
        orderId: orderId || null,
        type: "message",
        title: title || "Message from the studio",
        body: String(text),
        direction: "manual",
        channel: resolved.channel,
        recipient: resolved.recipient || null,
        deliveryStatus: "sent",
        sentAt: new Date(),
      },
      include: {
        order: { select: { id: true, garmentDesign: true } },
      },
    });

    return Response.json(notification, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
