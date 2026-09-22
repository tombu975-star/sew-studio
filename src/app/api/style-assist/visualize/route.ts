import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenant";
import ZAI from "@/lib/ai-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ConceptInput {
  conceptName?: string;
  silhouette?: string;
  fabric?: string;
  colour?: string;
  neckline?: string;
  sleeveStyle?: string;
  length?: string;
  embellishment?: string;
  garmentType?: string;
}

interface RequestBody {
  concept?: ConceptInput;
}

function buildImagePrompt(c: ConceptInput): string {
  const parts: string[] = [];
  parts.push("Elegant fashion design illustration of a");
  if (c.colour) parts.push(c.colour);
  if (c.silhouette) parts.push(c.silhouette);
  parts.push(`${c.garmentType || "garment"},`);
  if (c.fabric) parts.push(`${c.fabric},`);
  if (c.neckline) parts.push(`${c.neckline} neckline,`);
  if (c.sleeveStyle) parts.push(`${c.sleeveStyle} sleeves,`);
  parts.push(`${c.length || "floor-length"},`);
  if (c.embellishment) parts.push(`${c.embellishment} embellishment,`);
  parts.push(
    "editorial atelier sketch, soft studio lighting, full-length, on an elegant figure, high fashion, detailed, beautiful",
  );
  return parts.join(" ").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  try {
    // Tenant guard — only authenticated users of a shop can call this route.
    const ctx = await getTenant(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const concept = body.concept || {};

    if (!concept || typeof concept !== "object") {
      return NextResponse.json(
        { error: "concept is required" },
        { status: 400 },
      );
    }

    const prompt = buildImagePrompt(concept);

    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: "768x1344",
    });

    const base64 = response?.data?.[0]?.base64;
    if (!base64) {
      return NextResponse.json(
        { error: "Image generation returned no data" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64}`,
    });
  } catch (err) {
    console.error("[style-assist/visualize] error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate concept image",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
