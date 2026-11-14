import { NextResponse } from "next/server";
import { getSystemAdminSession } from "@/lib/db/session";
import { describeSettings, saveSettings, usingFallbackEncryptionKey, SETTING_DEFS } from "@/lib/integration-settings";
import { getAppBaseUrl } from "@/lib/website-content.server";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      {
        settings: await describeSettings(),
        appUrl: await getAppBaseUrl(request),
        fallbackEncryptionKey: usingFallbackEncryptionKey(),
        adminEmail: session.email,
      },
      { headers: noStore }
    );
  } catch (error) {
    console.error("[admin/integrations] load failed", error);
    return NextResponse.json({ error: "Could not load integration settings." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSystemAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { values?: unknown; clear?: unknown } | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const values: Record<string, string> = {};
  if (body.values && typeof body.values === "object" && !Array.isArray(body.values)) {
    for (const [k, v] of Object.entries(body.values as Record<string, unknown>)) {
      if (typeof v !== "string") return NextResponse.json({ error: `Invalid value for ${k}.` }, { status: 400 });
      values[k] = v;
    }
  }
  const known = new Set(SETTING_DEFS.map((d) => d.key));
  const clear = Array.isArray(body.clear) ? body.clear.filter((k): k is string => typeof k === "string" && known.has(k)) : [];

  try {
    const result = await saveSettings(session.adminId, { values, clear });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(
      { settings: await describeSettings(), appUrl: await getAppBaseUrl(request), fallbackEncryptionKey: usingFallbackEncryptionKey(), adminEmail: session.email },
      { headers: noStore }
    );
  } catch (error) {
    console.error("[admin/integrations] save failed", error);
    return NextResponse.json({ error: "Could not save integration settings." }, { status: 500 });
  }
}
