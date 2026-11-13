import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { customerProfile, request: designRequest } = body || {};
    if (!designRequest || !designRequest.garment_type) {
      return Response.json({ error: 'garment_type is required' }, { status: 400 });
    }

    const prompt = `You are a fashion design assistant helping a professional dressmaker/designer generate garment design concepts for a specific customer. You are NOT making any medical, biological or definitive body judgements — only garment-fitting, pattern-making and style observations.

CUSTOMER STYLE PROFILE (may be partial):
${JSON.stringify(customerProfile || {}, null, 2)}

CURRENT DESIGN REQUEST:
${JSON.stringify(designRequest, null, 2)}

Generate 3 to 5 distinct, specific design concepts (not generic) that use the customer's available data (style preferences, colours, fabrics, fit preferences, proportions, previous orders/feedback) combined with the current design request. For each concept, explain WHY it may work by referencing specific pieces of the customer's data. If customer data is limited, say so plainly in the explanation rather than inventing preferences.

Also assess overall data confidence as one of: Limited, Good, Complete — based on how much customer preference/measurement/history data was actually provided.

For each concept give a style_match_percent (0-100, integer) representing how well it aligns with the customer's saved preferences and the current request, labelled clearly as a non-scientific style match estimate, plus a short match_breakdown string covering style/fit/colour/fabric/occasion alignment in a few words each.

Never state that a customer "cannot" wear something, never diagnose body types, never use stereotypes.`;

    const schema = {
      type: 'object',
      properties: {
        data_confidence: { type: 'string', enum: ['Limited', 'Good', 'Complete'] },
        confidence_note: { type: 'string' },
        concepts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              concept_name: { type: 'string' },
              silhouette: { type: 'string' },
              neckline: { type: 'string' },
              sleeve_style: { type: 'string' },
              length: { type: 'string' },
              waist_fit: { type: 'string' },
              fabric: { type: 'string' },
              colour: { type: 'string' },
              detailing: { type: 'string' },
              embellishment: { type: 'string' },
              print_pattern: { type: 'string' },
              design_direction: { type: 'string' },
              fit_considerations: { type: 'string' },
              why_this_may_work: { type: 'string' },
              potential_alterations: { type: 'string' },
              style_match_percent: { type: 'number' },
              match_breakdown: { type: 'string' }
            },
            required: ['concept_name', 'why_this_may_work']
          }
        }
      },
      required: ['concepts', 'data_confidence']
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}