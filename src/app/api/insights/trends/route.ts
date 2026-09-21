import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SummaryBody {
  orderCount?: number;
  totalSales?: number;
  outstanding?: number;
  statusBreakdown?: Record<string, number>;
  paymentsThisMonth?: number;
  upcomingFittings?: number;
  customerSources?: Record<string, number>;
  [key: string]: unknown;
}

const SYSTEM_PROMPT =
  "You are a business advisor for a custom tailoring atelier in Ghana (currency GHS). Respond with ONLY valid JSON (no markdown).";

function buildUserPrompt(summary: SummaryBody): string {
  return [
    "Here is the studio's current data summary:",
    JSON.stringify(summary),
    "",
    "Provide 3-5 short, specific, actionable insights (one sentence each) for the atelier owner.",
    "Focus on outstanding payments, production bottlenecks, staffing, and client acquisition.",
    "Return JSON with this exact shape (no markdown fences, no extra text):",
    JSON.stringify({ suggestions: ["string", "string"] }),
  ].join("\n");
}

function stripJsonFences(text: string): string {
  let out = text.trim();
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:json)?\s*/i, "");
  }
  if (out.endsWith("```")) {
    out = out.replace(/```\s*$/i, "");
  }
  return out.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SummaryBody;

    const userPrompt = buildUserPrompt(body || {});

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

    let parsed: { suggestions?: unknown };

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

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s) => typeof s === "string").map((s) => String(s))
      : [];

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[insights/trends] error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate insights",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
