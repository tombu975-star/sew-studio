import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/orders — list orders with relations
export async function GET() {
  const orders = await db.order.findMany({
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
  const body = await req.json();

  const data: any = {
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
    data.assignedStaff = { connect: { id: body.assignedStaffId } };
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
