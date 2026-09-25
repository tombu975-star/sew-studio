import { getTenant } from "@/lib/supabase/session";
import { serializeStyleConcept } from "@/lib/supabase/serializers";

const CAMEL_TO_SNAKE: Record<string, string> = {
  garmentType: "garment_type",
  conceptName: "concept_name",
  status: "status",
  occasion: "occasion",
  desiredLook: "desired_look",
  season: "season",
  colourPreference: "colour_preference",
  silhouette: "silhouette",
  neckline: "neckline",
  sleeveStyle: "sleeve_style",
  length: "length",
  fabric: "fabric",
  colour: "colour",
  detailing: "detailing",
  embellishment: "embellishment",
  whyThisMayWork: "why_this_may_work",
  fitConsiderations: "fit_considerations",
  designDirection: "design_direction",
  imageUrl: "image_url",
  rejectionReason: "rejection_reason",
  dataConfidence: "data_confidence",
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data: existing } = await ctx.supabase
      .from("style_concepts")
      .select("id")
      .eq("id", id)
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!existing) return Response.json({ error: "Style concept not found" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const [camel, snake] of Object.entries(CAMEL_TO_SNAKE)) {
      if (camel in body) data[snake] = body[camel] == null ? null : String(body[camel]);
    }
    if ("budget" in body) data.budget = body.budget == null ? null : Number(body.budget) || null;
    if ("matchPercent" in body)
      data.match_percent = body.matchPercent == null ? null : Number(body.matchPercent) || null;
    if ("customerId" in body && body.customerId) {
      const { data: customer } = await ctx.supabase
        .from("customers")
        .select("id")
        .eq("id", String(body.customerId))
        .eq("shop_id", ctx.shopId)
        .maybeSingle();
      if (customer) data.customer_id = String(body.customerId);
    }

    const { data: concept, error } = await ctx.supabase
      .from("style_concepts")
      .update(data)
      .eq("id", id)
      .select("*, customer:customers(*)")
      .single();
    if (error) throw error;

    return Response.json(serializeStyleConcept(concept));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
