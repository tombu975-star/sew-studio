// Shared helpers for the Accra Runs and Inventory APIs.
import { getTenant } from "@/lib/db/session";

export type Tenant = NonNullable<Awaited<ReturnType<typeof getTenant>>>;

/** Returns the tenant, or a ready-made error Response when the caller may not write. */
export async function requireWriter(): Promise<{ ctx: Tenant } | { error: Response }> {
  const ctx = await getTenant();
  if (!ctx) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (ctx.role === "trainee") return { error: Response.json({ error: "Trainees can view this tool but not change it." }, { status: 403 }) };
  return { ctx };
}

export const money = (v: unknown) => Math.max(0, Math.round((Number(v) || 0) * 100) / 100);
export const text = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const dateOrNull = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export const serializeItem = (i: Record<string, any>) => ({
  id: i.id, tripId: i.trip_id, description: i.description, plannedBefore: i.planned_before,
  obtained: i.obtained, plannedCost: Number(i.planned_cost), actualCost: Number(i.actual_cost), orderId: i.order_id,
});
export const serializeTrip = (t: Record<string, any>) => ({
  id: t.id, tripDate: t.trip_date, status: t.status, notes: t.notes ?? "", shopperId: t.shopper_id,
  items: Array.isArray(t.items) ? t.items.map(serializeItem) : [],
});
export const serializeAsset = (a: Record<string, any>) => ({
  id: a.id, name: a.name, category: a.category, purchaseDate: a.purchase_date,
  purchaseCost: a.purchase_cost === null ? null : Number(a.purchase_cost), condition: a.condition, status: a.status,
  location: a.location ?? "", lastServiceDate: a.last_service_date, nextServiceDue: a.next_service_due,
});

export const ASSET_CATEGORIES = ["Machine", "Mannequin", "Iron & Pressing", "Cutting Table", "Furniture", "Tools", "Other"];
export const ASSET_CONDITIONS = ["New", "Good", "Fair", "Needs Repair"];
export const ASSET_STATUSES = ["In Use", "In Storage", "Under Repair", "Retired"];
