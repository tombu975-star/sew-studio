import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { notifyCustomer, statusChangeMessage } from "@/lib/notify";

// GET /api/orders/[id] — single order with full relations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenant(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, shopId: ctx.shopId },
    include: {
      customer: true,
      assignedStaff: true,
      payments: { orderBy: { date: "asc" } },
      fittings: { orderBy: { date: "asc" } },
      tasks: {
        include: { staff: true, order: { include: { customer: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

// PATCH /api/orders/[id] — partial update (esp. status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getTenant(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership + fetch current state for notification diffing.
  const existing = await db.order.findFirst({
    where: { id, shopId: ctx.shopId },
    select: { id: true, status: true, customerId: true, garmentDesign: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await req.json();

  // Track status change for customer notification.
  const statusChanged =
    body.status !== undefined && body.status !== existing.status;

  const data: any = {};
  if (body.garmentDesign !== undefined) data.garmentDesign = body.garmentDesign;
  if (body.orderDate !== undefined)
    data.orderDate = body.orderDate ? new Date(body.orderDate) : new Date();
  if (body.deliveryDate !== undefined)
    data.deliveryDate = body.deliveryDate ? new Date(body.deliveryDate) : null;
  if (body.status !== undefined) data.status = body.status;
  if (body.sellingPrice !== undefined)
    data.sellingPrice = Number(body.sellingPrice) || 0;
  if (body.fabricCost !== undefined)
    data.fabricCost = Number(body.fabricCost) || 0;
  if (body.labourCost !== undefined)
    data.labourCost = Number(body.labourCost) || 0;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.assignedStaffId !== undefined) {
    if (body.assignedStaffId) {
      // Verify staff belongs to tenant.
      const staff = await db.user.findFirst({
        where: { id: body.assignedStaffId, shopId: ctx.shopId },
        select: { id: true },
      });
      data.assignedStaffId = staff ? body.assignedStaffId : null;
    } else {
      data.assignedStaffId = null;
    }
  }
  if (body.customerId !== undefined) {
    // Verify customer belongs to tenant.
    const customer = await db.customer.findFirst({
      where: { id: body.customerId, shopId: ctx.shopId },
      select: { id: true },
    });
    if (customer) {
      data.customer = { connect: { id: body.customerId } };
    }
  }

  const updated = await db.order.update({
    where: { id },
    data,
    include: {
      customer: true,
      assignedStaff: true,
      payments: { orderBy: { date: "asc" } },
      fittings: { orderBy: { date: "asc" } },
      tasks: {
        include: { staff: true, order: { include: { customer: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Notify the customer about the status change.
  if (statusChanged) {
    const msg = statusChangeMessage(
      existing.garmentDesign,
      existing.status,
      updated.status
    );
    const type =
      updated.status === "Ready"
        ? "ready_for_collection"
        : updated.status === "Collected/Delivered" || updated.status === "Completed"
          ? "delivered"
          : "status_change";
    await notifyCustomer({
      shopId: ctx.shopId,
      customerId: existing.customerId,
      orderId: id,
      type,
      title: msg.title,
      body: msg.body,
      statusFrom: existing.status,
      statusTo: updated.status,
    });
  }

  return NextResponse.json(updated);
}
