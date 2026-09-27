import { getTenant } from "@/lib/supabase/session";
import { serializeSettings } from "@/lib/supabase/serializers";

export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let { data: settings } = await ctx.supabase
      .from("settings")
      .select("*")
      .eq("shop_id", ctx.shopId)
      .maybeSingle();

    if (!settings) {
      const { data: created, error } = await ctx.supabase
        .from("settings")
        .insert({ shop_id: ctx.shopId, owner_gender: "Madam", studio_name: "Madam Studio" })
        .select("*")
        .single();
      if (error) throw error;
      settings = created;
    }
    return Response.json(serializeSettings(settings));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    let { data: settings } = await ctx.supabase
      .from("settings")
      .select("id")
      .eq("shop_id", ctx.shopId)
      .maybeSingle();
    if (!settings) {
      const { data: created, error } = await ctx.supabase
        .from("settings")
        .insert({ shop_id: ctx.shopId, owner_gender: "Madam", studio_name: "Madam Studio" })
        .select("id")
        .single();
      if (error) throw error;
      settings = created;
    }

    const data: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      ownerGender: "owner_gender",
      studioName: "studio_name",
      currency: "currency",
    };
    for (const [key, column] of Object.entries(fieldMap)) {
      if (key in body && body[key] != null) data[column] = String(body[key]);
    }
    const numericFieldMap: Record<string, string> = {
      overheadAmount: "overhead_amount",
      selfPayout: "self_payout",
    };
    for (const [key, column] of Object.entries(numericFieldMap)) {
      if (key in body) data[column] = Number(body[key]) || 0;
    }

    // Business policies — clamped to sane ranges so a stray keystroke
    // can't quietly save a nonsensical term (e.g. a 400% deposit).
    const percentFieldMap: Record<string, string> = {
      depositPercent: "deposit_percent",
      rushFeePercent: "rush_fee_percent",
    };
    for (const [key, column] of Object.entries(percentFieldMap)) {
      if (key in body) data[column] = Math.min(100, Math.max(0, Number(body[key]) || 0));
    }
    const dayFieldMap: Record<string, string> = {
      quoteValidDays: "quote_valid_days",
      alterationsWindowDays: "alterations_window_days",
    };
    for (const [key, column] of Object.entries(dayFieldMap)) {
      if (key in body) data[column] = Math.max(0, Math.round(Number(body[key]) || 0));
    }
    if ("fittingsIncluded" in body) {
      data.fittings_included = Math.max(0, Math.round(Number(body.fittingsIncluded) || 0));
    }
    if ("fullBalanceBeforePickup" in body) {
      data.full_balance_before_pickup = Boolean(body.fullBalanceBeforePickup);
    }
    const policyTextFieldMap: Record<string, string> = {
      depositPolicyText: "deposit_policy_text",
      alterationsPolicyText: "alterations_policy_text",
      cancellationPolicyText: "cancellation_policy_text",
    };
    for (const [key, column] of Object.entries(policyTextFieldMap)) {
      if (key in body) data[column] = typeof body[key] === "string" ? body[key].slice(0, 2000) : "";
    }

    const { data: updated, error } = await ctx.supabase
      .from("settings")
      .update(data)
      .eq("id", settings.id)
      .select("*")
      .single();
    if (error) throw error;

    return Response.json(serializeSettings(updated));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
