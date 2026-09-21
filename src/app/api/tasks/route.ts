import { db } from "@/lib/db";

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      include: { order: { include: { customer: true } }, staff: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(tasks);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {
      title: String(body.title ?? "").trim(),
      status: body.status ? String(body.status) : "To Do",
      priority: body.priority ? String(body.priority) : "Medium",
    };
    if (body.orderId) data.orderId = String(body.orderId);
    if (body.staffId) data.staffId = String(body.staffId);
    if (body.dueDate) data.dueDate = new Date(body.dueDate);
    if (body.notes) data.notes = String(body.notes);
    const task = await db.task.create({
      data: data as Parameters<typeof db.task.create>[0]["data"],
      include: { order: { include: { customer: true } }, staff: true },
    });
    return Response.json(task, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
