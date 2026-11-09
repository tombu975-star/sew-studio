import { getTenant } from "@/lib/db/session";

// GET /api/portfolio?staffId=ID — portfolio of completed work.
// Without staffId: studio-wide portfolio (all completed/collected orders with images).
// With staffId: that person's portfolio (orders assigned to them).
export async function GET(req: Request) {
  try {
    const ctx = await getTenant();
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const staffId = url.searchParams.get("staffId");

    let query = ctx.db
      .from("orders")
      .select(
        "*, customer:customers(id, name), assigned_staff:profiles!orders_assigned_staff_id_fkey(id, full_name)"
      )
      .eq("shop_id", ctx.shopId)
      .in("status", ["Completed", "Collected/Delivered"]);
    if (staffId) query = query.eq("assigned_staff_id", staffId);

    const { data: orders, error } = await query
      .order("order_date", { ascending: false })
      .limit(100);
    if (error) throw error;

    return Response.json(
      orders.map((o) => ({
        id: o.id,
        customerId: o.customer_id,
        customer: o.customer ? { id: o.customer.id, name: o.customer.name } : null,
        garmentDesign: o.garment_design,
        designImage: o.design_image,
        orderDate: o.order_date,
        deliveryDate: o.delivery_date,
        status: o.status,
        assignedStaffId: o.assigned_staff_id,
        assignedStaff: o.assigned_staff
          ? { id: o.assigned_staff.id, fullName: o.assigned_staff.full_name }
          : null,
        sellingPrice: o.selling_price,
        priority: o.priority,
        createdAt: o.created_at,
      }))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
