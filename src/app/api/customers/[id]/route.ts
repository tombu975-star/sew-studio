import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/customers/[id] → { customer, orders, measurements, feedback, styleConcepts }
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const [orders, measurements, feedback, styleConcepts] = await Promise.all([
    db.order.findMany({
      where: { customerId: id },
      orderBy: { orderDate: "desc" },
      include: { assignedStaff: true },
    }),
    db.measurementSet.findMany({
      where: { customerId: id },
      orderBy: { dateTaken: "desc" },
    }),
    db.customerFeedback.findMany({
      where: { customerId: id },
      orderBy: { date: "desc" },
    }),
    db.styleConcept.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    customer,
    orders,
    measurements,
    feedback,
    styleConcepts,
  });
}

// PATCH /api/customers/[id] → Customer
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body: Record<string, unknown> = await req.json().catch(() => ({}));

  // Verify the customer exists first.
  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const data: Prisma.CustomerUncheckedUpdateInput = {};
  const strData = data as unknown as Record<string, string | null>;

  const stringFields = [
    "name",
    "phone",
    "email",
    "whatsapp",
    "gender",
    "occupation",
    "city",
    "country",
    "entrySource",
    "referredBy",
    "customerType",
    "preferredStyles",
    "favouriteColours",
    "coloursToAvoid",
    "favouriteFabrics",
    "preferredFit",
    "designPreferences",
    "styleNotes",
    "skinTone",
    "notes",
    "status",
  ] as const;

  for (const key of stringFields) {
    if (key in body) {
      const v = body[key];
      strData[key] = v === undefined || v === null ? null : String(v);
    }
  }

  // Numeric fields
  if ("height" in body) {
    const v = body.height;
    if (v === null || v === "" || v === undefined) data.height = null;
    else {
      const n = Number(v);
      if (!Number.isNaN(n)) data.height = n;
    }
  }
  if ("weight" in body) {
    const v = body.weight;
    if (v === null || v === "" || v === undefined) data.weight = null;
    else {
      const n = Number(v);
      if (!Number.isNaN(n)) data.weight = n;
    }
  }
  if ("loyaltyPoints" in body) {
    const v = body.loyaltyPoints;
    if (v === null || v === "" || v === undefined) data.loyaltyPoints = 0;
    else {
      const n = Number(v);
      if (!Number.isNaN(n)) data.loyaltyPoints = n;
    }
  }

  const updated = await db.customer.update({ where: { id }, data });
  return NextResponse.json(updated);
}
