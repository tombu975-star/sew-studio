import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/db/session";
import { serializeMeasurementSet } from "@/lib/db/serializers";
import { buildMeasurementData } from "@/lib/db/measurement-input";

// POST /api/measurements → MeasurementSet
export async function POST(req: NextRequest) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body?.customerId || typeof body.customerId !== "string") {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  const { data: customer } = await ctx.db
    .from("customers")
    .select("id")
    .eq("id", body.customerId)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const built = buildMeasurementData(body, { partial: false });
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  const data = {
    ...built.data,
    shop_id: ctx.shopId,
    customer_id: body.customerId,
    staff_id: ctx.userId, // attributed to whoever took the measurements
    unit: "cm", // always stored in centimetres; client converts before sending
  };

  const { data: measurement, error } = await ctx.db
    .from("measurement_sets")
    .insert(data)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(serializeMeasurementSet(measurement), { status: 201 });
}
