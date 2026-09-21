import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// GET /api/customers → Customer[] (each with computed _orderCount)
export async function GET() {
  const customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
    },
  });

  const result = customers.map((c) => {
    const { _count, ...rest } = c;
    return { ...rest, _orderCount: _count.orders };
  });

  return NextResponse.json(result);
}

// POST /api/customers → Customer
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const data: Prisma.CustomerUncheckedCreateInput = {
    name: String(body.name).trim(),
    phone: body.phone ?? null,
    email: body.email ?? null,
    whatsapp: body.whatsapp ?? null,
    gender: body.gender ?? null,
    occupation: body.occupation ?? null,
    city: body.city ?? null,
    country: body.country ?? null,
    entrySource: body.entrySource ?? null,
    referredBy: body.referredBy ?? null,
    customerType: body.customerType ?? null,
    preferredStyles: body.preferredStyles ?? null,
    favouriteColours: body.favouriteColours ?? null,
    coloursToAvoid: body.coloursToAvoid ?? null,
    favouriteFabrics: body.favouriteFabrics ?? null,
    preferredFit: body.preferredFit ?? null,
    designPreferences: body.designPreferences ?? null,
    styleNotes: body.styleNotes ?? null,
    skinTone: body.skinTone ?? null,
    notes: body.notes ?? null,
    status: body.status ?? "Active",
    loyaltyPoints: 0,
  };

  if (body.height != null && body.height !== "") {
    const h = Number(body.height);
    if (!Number.isNaN(h)) data.height = h;
  }
  if (body.weight != null && body.weight !== "") {
    const w = Number(body.weight);
    if (!Number.isNaN(w)) data.weight = w;
  }
  if (body.loyaltyPoints != null && body.loyaltyPoints !== "") {
    const lp = Number(body.loyaltyPoints);
    if (!Number.isNaN(lp)) data.loyaltyPoints = lp;
  }
  const customer = await db.customer.create({ data });
  return NextResponse.json(customer, { status: 201 });
}
