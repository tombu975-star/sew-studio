import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

// POST /api/measurements → MeasurementSet
export async function POST(req: NextRequest) {
  const ctx = await getTenant(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (!body?.customerId || typeof body.customerId !== "string") {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    );
  }

  // Verify the customer belongs to the tenant.
  const customer = await db.customer.findFirst({
    where: { id: body.customerId, shopId: ctx.shopId },
    select: { id: true },
  });
  if (!customer) {
    return NextResponse.json(
      { error: "Customer not found" },
      { status: 404 }
    );
  }

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const data: Prisma.MeasurementSetUncheckedCreateInput = {
    shopId: ctx.shopId,
    customerId: body.customerId,
    staffId: body.staffId ?? null,
    unit: body.unit ?? "cm",
    dateTaken: body.dateTaken ? new Date(body.dateTaken) : new Date(),
    bust: num(body.bust),
    waist: num(body.waist),
    hip: num(body.hip),
    shoulder: num(body.shoulder),
    length: num(body.length),
    sleeve: num(body.sleeve),
    inseam: num(body.inseam),
    neck: num(body.neck),
    notes: body.notes ?? null,
  };

  const measurement = await db.measurementSet.create({ data });
  return NextResponse.json(measurement, { status: 201 });
}
