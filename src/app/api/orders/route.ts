import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

// GET /api/orders — list orders with relations
//
// Scoped by role, not just by tenant: the owner and trainers oversee the
// whole shop, so they see every order. Staff and trainees only work their
// own assignments, so the Production Board (and any other view built on
// this endpoint) should only ever return orders assigned to them, plus
// unassigned orders that are still up for grabs. This is enforced here,
// not just hidden in the UI, since the client's role can't be trusted.
export async function GET(req: NextRequest) {
  const ctx = await getTenant(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canSeeAll = ctx.role === "madam" || ctx.role === "trainer";
  const where = canSeeAll
    ? tenantWhere(ctx.shopId)
    : tenantWhere(ctx.shopId, {
        OR: [{ assignedStaffId: ctx.userId }, { assignedStaffId: null }],
      });

  const orders = await db.order.findMany({
    where,
    include: {
      customer: true,
      assignedStaff: true,
      payments: { orderBy: { date: "asc" } },
      fittings: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

// POST /api/orders — create a new order
export async function POST(req: NextRequest) {
  const ctx = await getTenant(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Verify the customer belongs to this tenant.
  const customer = await db.customer.findFirst({
    where: { id: body.customerId, shopId: ctx.shopId },
    select: { id: true },
  });
  if (!customer) {
    return NextResponse.json(
      { error: "Customer not found in this shop" },
      { status: 404 }
    );
  }

  const data: any = {
    shopId: ctx.shopId,
    customer: { connect: { id: body.customerId } },
    garmentDesign: body.garmentDesign,
    orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
    deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
    status: body.status || "Enquiry",
    sellingPrice: Number(body.sellingPrice) || 0,
    fabricCost: Number(body.fabricCost) || 0,
    labourCost: Number(body.labourCost) || 0,
    notes: body.notes || null,
    priority: body.priority || "Medium",
  };

  if (body.assignedStaffId) {
    // Verify the assigned staff belongs to this tenant.
    const staff = await db.user.findFirst({
      where: { id: body.assignedStaffId, shopId: ctx.shopId },
      select: { id: true },
    });
    if (staff) {
      data.assignedStaff = { connect: { id: body.assignedStaffId } };
    }
  }

  const created = await db.order.create({
    data,
    include: {
      customer: true,
      assignedStaff: true,
      payments: true,
      fittings: true,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
