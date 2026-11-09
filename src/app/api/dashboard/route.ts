import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import {
  serializeOrder,
  serializePayment,
  serializeFitting,
  serializeTask,
  serializeUser,
  serializeCustomer,
  serializeStyleConcept,
  serializeSettings,
} from "@/lib/db/serializers";

// Payload is deliberately lean: the dashboard already receives payments and
// fittings as their own top-level lists, so embedding them again inside every
// order (plus a full customer + staff row per order) only multiplied the
// response size as the studio grew. Orders carry just the customer name/id.
const ORDER_SELECT = "*, customer:customers(id, name, phone)";

export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { rows: menuRows } = await getPool().query(
      "select menu_key, enabled from public.system_menu_settings"
    );
    const menuEnabled = new Map<string, boolean>(
      menuRows.map((row) => [row.menu_key, row.enabled])
    );

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
      ctx.db
        .from("orders")
        .select(ORDER_SELECT)
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false }),
      ctx.db
        .from("payments")
        .select("*, order:orders!inner(shop_id)")
        .eq("order.shop_id", ctx.shopId)
        .order("date", { ascending: false }),
      ctx.db
        .from("fittings")
        .select("*, order:orders!inner(id, shop_id, garment_design, customer:customers(id, name))")
        .eq("order.shop_id", ctx.shopId)
        .order("date", { ascending: true }),
      ctx.db
        .from("tasks")
        .select("*, order:orders(id, garment_design)")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false }),
      ctx.db
        .from("profiles")
        .select("*")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: true }),
      ctx.db
        .from("customers")
        .select("*")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false }),
      ctx.db
        .from("style_concepts")
        .select("*, customer:customers(id, name)")
        .eq("shop_id", ctx.shopId)
        .order("created_at", { ascending: false })
        .limit(100),
      ctx.db.from("settings").select("*").eq("shop_id", ctx.shopId).maybeSingle(),
    ]);

    for (const res of [ordersRes, paymentsRes, fittingsRes, tasksRes, usersRes, customersRes, styleConceptsRes]) {
      if (res.error) throw res.error;
    }

    let settings = settingsRes.data;
    if (!settings) {
      const { data: created, error } = await ctx.db
        .from("settings")
        .insert({ shop_id: ctx.shopId, owner_gender: "Madam", studio_name: "Madam Studio" })
        .select("*")
        .single();
      if (error) throw error;
      settings = created;
    }

    return Response.json({
      orders: menuEnabled.get("orders") === false ? [] : (ordersRes.data ?? []).map(serializeOrder),
      payments: menuEnabled.get("orders") === false ? [] : (paymentsRes.data ?? []).map(serializePayment),
      fittings: menuEnabled.get("fittings") === false ? [] : (fittingsRes.data ?? []).map((f) => ({
        ...serializeFitting(f),
        order: f.order ? serializeOrder(f.order) : null,
      })),
      tasks: menuEnabled.get("tasks") === false ? [] : (tasksRes.data ?? []).map(serializeTask),
      users: menuEnabled.get("team") === false ? [] : (usersRes.data ?? []).map(serializeUser),
      customers: menuEnabled.get("customers") === false ? [] : (customersRes.data ?? []).map(serializeCustomer),
      settings: menuEnabled.get("settings") === false ? null : serializeSettings(settings),
      styleConcepts: menuEnabled.get("style-assist") === false
        ? []
        : (styleConceptsRes.data ?? []).map(serializeStyleConcept),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
