import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export async function GET(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await db.settings.findUnique({
      where: { shopId: ctx.shopId },
    });
    if (!settings) {
      settings = await db.settings.create({
        data: { shopId: ctx.shopId, ownerGender: "Madam", studioName: "Madam Studio" },
      });
    }
    return Response.json(settings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getTenant(req);
    if (!ctx) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let settings = await db.settings.findUnique({
      where: { shopId: ctx.shopId },
    });
    if (!settings) {
      settings = await db.settings.create({
        data: { shopId: ctx.shopId, ownerGender: "Madam", studioName: "Madam Studio" },
      });
    }
    const data: Record<string, unknown> = {};
    for (const k of ["ownerGender", "studioName", "currency"] as const) {
      if (k in body && body[k] != null) data[k] = String(body[k]);
    }
    for (const k of ["overheadAmount", "selfPayout"] as const) {
      if (k in body) data[k] = Number(body[k]) || 0;
    }
    const updated = await db.settings.update({
      where: { id: settings.id },
      data: data as Parameters<typeof db.settings.update>[0]["data"],
    });
    return Response.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
