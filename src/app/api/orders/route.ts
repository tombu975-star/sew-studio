import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenant, tenantWhere } from "@/lib/tenant";

// GET /api/orders — list orders with relations
export async function GET(req: NextRequest) {
  const ctx = await getTenant(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await db.order.findMany({
    where: tenantWhere(ctx.shopId),
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
