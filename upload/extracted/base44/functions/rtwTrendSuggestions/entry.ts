import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Madam-only: seasonal, festive and trend-based Ready-to-Wear suggestions,
// grounded with live internet context (season, upcoming Ghanaian/African
// fashion occasions, current trends) plus what the studio already makes well.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { popular_garments } = await req.json().catch(() => ({}));
    const garmentsText = Array.isArray(popular_garments) && popular_garments.length > 0
      ? `The studio's most-ordered garment types recently are: ${popular_garments.slice(0, 5).join(', ')}.`
      : '';

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Today's date is ${today}. You are a fashion trend advisor for a bespoke fashion atelier in Ghana that also sells ready-to-wear (RTW) pieces.
${garmentsText}
Using current season, weather, and any upcoming festive, cultural, wedding or holiday occasions in Ghana/West Africa in the next 1-3 months, suggest 4 ready-to-wear pieces the atelier could produce and stock now to catch demand.
For each suggestion give: a short title, the occasion/season it targets, and a one-sentence styling/fabric note.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                occasion: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['title', 'occasion', 'note'],
            },
          },
        },
        required: ['suggestions'],
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}