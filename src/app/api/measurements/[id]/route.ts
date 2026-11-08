import { NextRequest, NextResponse } from "next/server";
import { getTenant } from "@/lib/supabase/session";
import { serializeMeasurementSet } from "@/lib/supabase/serializers";
import type { Database } from "@/lib/supabase/database.types";
import { buildMeasurementData } from "@/lib/supabase/measurement-input";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/measurements/[id] → MeasurementSet
// Partial update: only the fields present in the body change, so confirming a
// set or recording customer approval can't disturb the measurements. A body
// containing any extended measurement is treated as a full-form edit (see
// buildMeasurementData).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { data: existing } = await ctx.supabase
    .from("measurement_sets")
    .select("id")
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Measurement set not found" }, { status: 404 });

  const built = buildMeasurementData(body, { partial: true });
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });
  if (Object.keys(built.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data: updated, error } = await ctx.supabase
    .from("measurement_sets")
    .update(built.data as Database["public"]["Tables"]["measurement_sets"]["Update"])
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(serializeMeasurementSet(updated));
}

// DELETE /api/measurements/[id]
// Measurement history is part of the client's record, so only the owner or a
// trainer can remove a set (the database policy enforces the same rule).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ctx = await getTenant();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.role !== "madam" && ctx.role !== "trainer") {
    return NextResponse.json(
      { error: "Only the studio owner or a trainer can delete a measurement set." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { data: deleted, error } = await ctx.supabase
    .from("measurement_sets")
    .delete()
    .eq("id", id)
    .eq("shop_id", ctx.shopId)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Measurement set not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
