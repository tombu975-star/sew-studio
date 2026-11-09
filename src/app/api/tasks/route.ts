import type { Database } from "@/lib/db/database.types";
import { getTenant } from "@/lib/db/session";
import { serializeTask } from "@/lib/db/serializers";

const TASK_SELECT =
  "*, order:orders(*, customer:customers(*)), staff:profiles!tasks_staff_id_fkey(*), graded_by:profiles!tasks_graded_by_id_fkey(id, full_name)";

// GET /api/tasks — list tasks with relations
//
// Scoped by role, not just by tenant: the owner oversees the whole shop and
// sees every task. Everyone else only sees their own scope — staff and
// trainees see tasks assigned to them; trainers see tasks assigned to
// themselves plus the trainees they personally mentor (so they can still
// review and grade that work, but never other people's). RLS already
// guarantees the tenant boundary; this narrows further by role.
export async function GET() {
  try {
    const ctx = await getTenant();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let query = ctx.db.from("tasks").select(TASK_SELECT).eq("shop_id", ctx.shopId);
    if (ctx.role === "trainer") {
      const { data: mentees, error: menteeErr } = await ctx.db
        .from("profiles")
        .select("id")
        .eq("shop_id", ctx.shopId)
        .eq("role", "trainee")
        .eq("mentor_id", ctx.userId);
      if (menteeErr) throw menteeErr;
      const scope = [ctx.userId, ...(mentees || []).map((m) => m.id)];
      query = query.in("staff_id", scope);
    } else if (ctx.role !== "madam") {
      query = query.eq("staff_id", ctx.userId);
    }

    const { data: tasks, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return Response.json(tasks.map(serializeTask));
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
    const data: Database["public"]["Tables"]["tasks"]["Insert"] = {
      shop_id: ctx.shopId,
      title: String(body.title ?? "").trim(),
      status: body.status ? String(body.status) : "To Do",
      priority: body.priority ? String(body.priority) : "Medium",
    };
    if (body.orderId) {
      const { data: order } = await ctx.db
        .from("orders")
        .select("id")
        .eq("id", String(body.orderId))
        .eq("shop_id", ctx.shopId)
        .maybeSingle();
      if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
      data.order_id = String(body.orderId);
    }
    if (body.staffId) {
      const { data: staff } = await ctx.db
        .from("profiles")
        .select("id, role, mentor_id")
        .eq("id", String(body.staffId))
        .eq("shop_id", ctx.shopId)
        .maybeSingle();
      if (staff) {
        // A trainer may only hand out work to trainees they personally mentor.
        const allowed =
          ctx.role !== "trainer" ||
          (staff.role === "trainee" && staff.mentor_id === ctx.userId);
        if (allowed) data.staff_id = String(body.staffId);
      }
    }
    if (body.dueDate) data.due_date = new Date(body.dueDate).toISOString();
    if (body.notes) data.notes = String(body.notes);

    const { data: task, error } = await ctx.db
      .from("tasks")
      .insert(data)
      .select("*, order:orders(*, customer:customers(*)), staff:profiles!tasks_staff_id_fkey(*)")
      .single();
    if (error) throw error;

    return Response.json(serializeTask(task), { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
