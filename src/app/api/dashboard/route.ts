import { getTenant } from "@/lib/supabase/session";
import {
  serializeOrder,
  serializePayment,
  serializeFitting,
  serializeTask,
  serializeUser,
  serializeCustomer,
  serializeStyleConcept,
  serializeSettings,
} from "@/lib/supabase/serializers";

// Payload is deliberately lean: the dashboard already receives payments and
// fittings as their own top-level lists, so embedding them again inside every
// order (plus a full customer + staff row per order) only multiplied the
// response size as the studio grew. Orders carry just the customer name/id.
const ORDER_SELECT = "*, customer:customers(id, name, phone)";

export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const [
      ordersRes,
      paymentsRes,
      fittingsRes,
      tasksRes,
      usersRes,
      customersRes,
      styleConceptsRes,
      settingsRes,
    ] = await Promise.all([
      ctx.supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("payments")
        .select("*, order:orders!inner(shop_id)")
        .eq("order.shop_id", ctx.shopId)
        .order("date", { ascending: false }),
      ctx.supabase
        .from("fittings")
        .select("*, order:orders!inner(id, shop_id, garment_design, customer:customers(id, name))")
        .eq("order.shop_id", ctx.shopId)
        .order("date", { ascending: true }),
      ctx.supabase
        .from("tasks")
        .select("*, order:orders(id, garment_design)")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("profiles")
        .select("*")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: true }),
      ctx.supabase
        .from("customers")
        .select("*")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("style_concepts")
        .select("*, customer:customers(id, name)")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false })
        .limit(100),
      ctx.supabase.from("settings").select("*").eq("shop_id", ctx.shopId).maybeSingle(),
    ]);

    for (const res of [ordersRes, paymentsRes, fittingsRes, tasksRes, usersRes, customersRes, styleConceptsRes]) {
      if (res.error) throw res.error;
    }

    let settings = settingsRes.data;
    if (!settings) {
      const { data: created, error } = await ctx.supabase
        .from("settings")
        .insert({ shop_id: ctx.shopId, owner_gender: "Madam", studio_name: "Madam Studio" })
        .select("*")
        .single();
      if (error) throw error;
      settings = created;
    }

    return Response.json({
      orders: (ordersRes.data ?? []).map(serializeOrder),
      payments: (paymentsRes.data ?? []).map(serializePayment),
      fittings: (fittingsRes.data ?? []).map((f) => ({
        ...serializeFitting(f),
        order: f.order ? serializeOrder(f.order) : null,
      })),
      tasks: (tasksRes.data ?? []).map(serializeTask),
      users: (usersRes.data ?? []).map(serializeUser),
      customers: (customersRes.data ?? []).map(serializeCustomer),
      settings: serializeSettings(settings),
      styleConcepts: (styleConceptsRes.data ?? []).map(serializeStyleConcept),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
