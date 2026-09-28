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
    if ("currency" in body) {
      const code = String(body.currency ?? "").trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(code)) {
        return Response.json({ error: "Currency must be a 3-letter ISO 4217 code." }, { status: 400 });
      }
      data.currency = code;
      body.currency = code;
    }
    const numericFieldMap: Record<string, string> = {
      overheadAmount: "overhead_amount",
      overheadRecoveryBasis: "overhead_recovery_basis",
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

    // Overhead breakdown — a list of {id, name, amount} line items. While
    // non-empty, its total stands in for the flat "overhead per order"
    // amount everywhere True Cost is computed.
    if ("overheadItems" in body) {
      const items = Array.isArray(body.overheadItems) ? body.overheadItems : [];
      data.overhead_items = items
        .map((it: any) => ({
          id: String(it?.id ?? ""),
          name: typeof it?.name === "string" ? it.name.trim().slice(0, 80) : "",
          amount: Math.max(0, Number(it?.amount) || 0),
        }))
        .filter((it: { name: string }) => it.name.length > 0);
    }

    // Capacity & alerts
    if ("outstandingBalanceAlertThreshold" in body) {
      data.outstanding_balance_alert_threshold = Math.max(
        0,
        Number(body.outstandingBalanceAlertThreshold) || 0
      );
    }
    if ("typicalActiveOrdersPerStaff" in body) {
      data.typical_active_orders_per_staff = Math.max(
        1,
        Math.round(Number(body.typicalActiveOrdersPerStaff) || 1)
      );
    }

    // Studio contact & registration details
    const contactFieldMap: Record<string, string> = {
      contactPhone: "contact_phone",
      contactEmail: "contact_email",
      address: "address",
      taxId: "tax_id",
      invoicePrefix: "invoice_prefix",
    };
    for (const [key, column] of Object.entries(contactFieldMap)) {
      if (key in body) data[column] = typeof body[key] === "string" ? body[key].trim().slice(0, 300) : "";
    }

    const { data: updated, error } = await ctx.supabase
      .from("settings")
      .update(data)
      .eq("id", settings.id)
      .select("*")
      .single();
    if (error) throw error;

    // Currency also lives on `shops` (read into the auth session / JWT-free
    // client state via shop:shops(...) in /api/auth/me and /login) so the
    // rest of the app can format money without an extra settings fetch.
    // Keep the two in sync whenever the owner changes it here — otherwise
    // the session would keep reporting the shop's old currency forever.
    if ("currency" in body && body.currency != null) {
      await ctx.supabase
        .from("shops")
        .update({ currency: String(body.currency) })
        .eq("id", ctx.shopId);
    }

    return Response.json(serializeSettings(updated));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
