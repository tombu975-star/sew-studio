import type { Database } from "@/lib/supabase/database.types";
import { getTenant } from "@/lib/supabase/session";
import { serializeStyleConcept } from "@/lib/supabase/serializers";

export async function GET(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");

    let query = ctx.supabase
      .from("style_concepts")
      .select("*, customer:customers(*)")
      .eq("shop_id", ctx.shopId);
    if (customerId) query = query.eq("customer_id", customerId);

    const { data: concepts, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return Response.json(concepts.map(serializeStyleConcept));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { data: customer } = await ctx.supabase
      .from("customers")
      .select("id")
      .eq("id", String(body.customerId))
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!customer) {
      return Response.json({ error: "Customer not found in this shop" }, { status: 404 });
    }

    const data: Database["public"]["Tables"]["style_concepts"]["Insert"] = {
      shop_id: ctx.shopId,
      customer_id: String(body.customerId),
      garment_type: String(body.garmentDesign ?? body.garmentType ?? "").trim(),
      concept_name: String(body.conceptName ?? "").trim(),
      status: body.status ? String(body.status) : "Suggested",
    };
    if (body.occasion) data.occasion = String(body.occasion);
    if (body.desiredLook) data.desired_look = String(body.desiredLook);
    if (body.season) data.season = String(body.season);
    if (body.budget != null) data.budget = Number(body.budget) || null;
    if (body.colourPreference) data.colour_preference = String(body.colourPreference);
    if (body.silhouette) data.silhouette = String(body.silhouette);
    if (body.neckline) data.neckline = String(body.neckline);
    if (body.sleeveStyle) data.sleeve_style = String(body.sleeveStyle);
    if (body.length) data.length = String(body.length);
    if (body.fabric) data.fabric = String(body.fabric);
    if (body.colour) data.colour = String(body.colour);
    if (body.detailing) data.detailing = String(body.detailing);
    if (body.embellishment) data.embellishment = String(body.embellishment);
    if (body.whyThisMayWork) data.why_this_may_work = String(body.whyThisMayWork);
    if (body.fitConsiderations) data.fit_considerations = String(body.fitConsiderations);
    if (body.matchPercent != null) data.match_percent = Number(body.matchPercent) || null;
    if (body.designDirection) data.design_direction = String(body.designDirection);
    if (body.imageUrl) data.image_url = String(body.imageUrl);
    if (body.rejectionReason) data.rejection_reason = String(body.rejectionReason);
    if (body.dataConfidence) data.data_confidence = String(body.dataConfidence);

    const { data: concept, error } = await ctx.supabase
      .from("style_concepts")
      .insert(data)
      .select("*, customer:customers(*)")
      .single();
    if (error) throw error;

    return Response.json(serializeStyleConcept(concept), { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
