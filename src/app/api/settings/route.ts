import { db } from "@/lib/db";

export async function GET() {
  try {
    let settings = await db.settings.findFirst();
    if (!settings) {
      settings = await db.settings.create({
        data: { ownerGender: "Madam", studioName: "Madam Studio" },
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
    const body = await req.json();
    let settings = await db.settings.findFirst();
    if (!settings) {
      settings = await db.settings.create({
        data: { ownerGender: "Madam", studioName: "Madam Studio" },
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
