import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/supabase/session";
import { serializeMeasurementSet } from "@/lib/supabase/serializers";

// POST /api/measurements → MeasurementSet
export async function POST(req: NextRequest) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body?.customerId || typeof body.customerId !== "string") {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }

  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("id", body.customerId)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const data = {
    shop_id: ctx.shopId,
    customer_id: body.customerId,
    staff_id: ctx.userId, // attributed to whoever took the measurements
    unit: "cm", // always stored in centimetres; client converts before sending
    date_taken: body.dateTaken ? new Date(body.dateTaken).toISOString() : new Date().toISOString(),
    bust: num(body.bust),
    waist: num(body.waist),
    hip: num(body.hip),
    shoulder: num(body.shoulder),
    length: num(body.length),
    sleeve: num(body.sleeve),
    inseam: num(body.inseam),
    neck: num(body.neck),
    height: num(body.height),
    weight: num(body.weight),
    across_back: num(body.acrossBack),
    bust_point: num(body.bustPoint),
    shoulder_to_bust: num(body.shoulderToBust),
    underbust: num(body.underbust),
    back_length: num(body.backLength),
    front_length: num(body.frontLength),
    upper_arm: num(body.upperArm),
    wrist: num(body.wrist),
    waist_to_hip: num(body.waistToHip),
    crotch_depth: num(body.crotchDepth),
    thigh: num(body.thigh),
    knee: num(body.knee),
    ankle: num(body.ankle),
    outseam: num(body.outseam),
    posture: typeof body.posture === "string" && body.posture.trim() ? body.posture.trim().slice(0, 60) : null,
    notes: body.notes ?? null,
  };

  const { data: measurement, error } = await ctx.supabase
    .from("measurement_sets")
    .insert(data)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(serializeMeasurementSet(measurement), { status: 201 });
}
