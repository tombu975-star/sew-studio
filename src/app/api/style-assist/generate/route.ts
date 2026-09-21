import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DesignRequest {
  garmentType?: string;
  occasion?: string;
  desiredLook?: string;
  season?: string;
  budget?: number | string;
  fabricAvailable?: string;
  colourPreference?: string;
  designerDirection?: string;
}

interface RequestBody {
  customerId?: string;
  request?: DesignRequest;
}

const SYSTEM_PROMPT =
  "You are a fashion design assistant helping a professional dressmaker generate garment design concepts for a specific customer. You make garment-fitting and style observations only — never medical/body-type judgements or stereotypes, and never state a customer 'cannot' wear something. Respond with ONLY valid JSON (no markdown, no prose).";

function stripJsonFences(text: string): string {
  let out = text.trim();
  // Remove leading ```json or ``` and trailing ```
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:json)?\s*/i, "");
  }
  if (out.endsWith("```")) {
    out = out.replace(/```\s*$/i, "");
  }
  return out.trim();
}

function buildUserPrompt(profile: unknown, request: DesignRequest): string {
  return [
    "CUSTOMER STYLE PROFILE:",
    JSON.stringify(profile),
    "",
    "CURRENT DESIGN REQUEST:",
    JSON.stringify(request),
    "",
    "Generate 3 distinct, specific garment design concepts for this customer that respond to the design request.",
    "Each concept's whyThisMayWork MUST reference concrete details from the customer's profile (preferred styles, favourite colours or colours to avoid, favourite fabrics, preferred fit, design preferences, measurements, previous orders, previous feedback, or approved/rejected style history).",
    "Fit considerations should reference the customer's measurements and preferred fit (observations only — never tell the customer what they cannot wear).",
    "Each concept must include a matchPercent (integer 0-100) indicating how well it matches the customer's style profile and request.",
    "Set dataConfidence to 'Limited', 'Good', or 'Complete' based on how much customer data is available (Limited = very little data, Complete = rich profile with measurements + history + feedback).",
    "Respond with ONLY this exact JSON shape (no markdown fences, no extra text):",
    JSON.stringify(
      {
        dataConfidence: "Limited | Good | Complete",
        confidenceNote: "one short sentence explaining the data confidence",
        concepts: [
          {
            conceptName: "string",
            silhouette: "string",
            neckline: "string",
            sleeveStyle: "string",
            length: "string",
            fabric: "string",
            colour: "string",
            detailing: "string",
            embellishment: "string",
            whyThisMayWork: "string referencing the customer's profile",
            fitConsiderations: "string referencing measurements and fit",
            matchPercent: 0,
            designDirection: "string",
          },
        ],
      },
      null,
      2,
    ),
  ].join("\n");
}

export async function POST(req: Request) {
  try {
    // Authenticate the caller (tenant guard).
    const ctx = await getTenant(req);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;

    const customerId = body.customerId;
    const request = body.request || {};

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 },
      );
    }
    if (!request.garmentType || !String(request.garmentType).trim()) {
      return NextResponse.json(
        { error: "request.garmentType is required" },
        { status: 400 },
      );
    }

    // Verify the customer belongs to the tenant before building the profile.
    const customer = await db.customer.findFirst({
      where: { id: customerId, shopId: ctx.shopId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const [measurementSets, orders, feedback, styleConcepts] =
      await Promise.all([
        db.measurementSet.findMany({
          where: { customerId, shopId: ctx.shopId },
          orderBy: { dateTaken: "desc" },
          take: 1,
        }),
        db.order.findMany({
          where: { customerId, shopId: ctx.shopId },
          orderBy: { orderDate: "desc" },
          take: 10,
          select: { garmentDesign: true, status: true },
        }),
        db.customerFeedback.findMany({
          where: { customerId, shopId: ctx.shopId },
          orderBy: { date: "desc" },
          take: 10,
          select: { rating: true, feedback: true, type: true },
        }),
        db.styleConcept.findMany({
          where: { customerId, shopId: ctx.shopId },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            conceptName: true,
            silhouette: true,
            fabric: true,
            colour: true,
            status: true,
            rejectionReason: true,
          },
        }),
      ]);

    const latestMeasurement = measurementSets[0] ?? null;

    const customerProfile = {
      name: customer.name,
      gender: customer.gender,
      occupation: customer.occupation,
      customerType: customer.customerType,
      preferredStyles: customer.preferredStyles,
      favouriteColours: customer.favouriteColours,
      coloursToAvoid: customer.coloursToAvoid,
      favouriteFabrics: customer.favouriteFabrics,
      preferredFit: customer.preferredFit,
      designPreferences: customer.designPreferences,
      styleNotes: customer.styleNotes,
      skinTone: customer.skinTone,
      height: customer.height,
      weight: customer.weight,
      measurements: latestMeasurement
        ? {
            dateTaken: latestMeasurement.dateTaken,
            unit: latestMeasurement.unit,
            bust: latestMeasurement.bust,
            waist: latestMeasurement.waist,
            hip: latestMeasurement.hip,
            shoulder: latestMeasurement.shoulder,
            length: latestMeasurement.length,
            sleeve: latestMeasurement.sleeve,
            inseam: latestMeasurement.inseam,
            neck: latestMeasurement.neck,
            notes: latestMeasurement.notes,
          }
        : null,
      previousOrders: orders,
      previousFeedback: feedback,
      approvedStyleHistory: styleConcepts.filter(
        (c) => c.status === "Approved" || c.status === "Converted",
      ),
      rejectedStyleHistory: styleConcepts
        .filter((c) => c.status === "Rejected")
        .map((c) => ({
          conceptName: c.conceptName,
          silhouette: c.silhouette,
          fabric: c.fabric,
          colour: c.colour,
          rejectionReason: c.rejectionReason,
        })),
    };

    const userPrompt = buildUserPrompt(customerProfile, request);

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const cleaned = stripJsonFences(raw);

    let parsed: {
      dataConfidence?: string;
      confidenceNote?: string;
      concepts?: unknown[];
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON",
          raw,
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 502 },
      );
    }

    const dataConfidence = (parsed.dataConfidence || "Limited") as
      | "Limited"
      | "Good"
      | "Complete";
    const confidenceNote = parsed.confidenceNote || "";
    const concepts = Array.isArray(parsed.concepts) ? parsed.concepts : [];

    return NextResponse.json({ dataConfidence, confidenceNote, concepts });
  } catch (err) {
    console.error("[style-assist/generate] error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate style concepts",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
