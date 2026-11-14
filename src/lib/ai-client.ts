// AI helper used by Style Assist and Trend Insights.
//
// It exposes the shape the routes already call
// (`zai.chat.completions.create(...)`, `zai.images.generations.create(...)`)
// backed by the public Anthropic (text) and OpenAI (images) APIs.
//
// Keys, model names and API addresses are read from what a platform admin saved
// in /admin/integrations, then from the Railway service variables
// (ANTHROPIC_API_KEY, OPENAI_API_KEY, ...). See src/lib/integration-settings.ts.

import { getSettings } from "@/lib/integration-settings";

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatCompletionsCreateOptions {
  messages: ChatMessage[];
  thinking?: unknown;
}

async function chatCompletionsCreate(opts: ChatCompletionsCreateOptions) {
  const cfg = await getSettings(["anthropic_api_key", "anthropic_model", "anthropic_api_url"]);
  const apiKey = cfg.anthropic_api_key;
  if (!apiKey) {
    throw new Error(
      "AI text generation isn't configured. A platform admin can add an Anthropic API key under Admin > Integrations to enable Style Assist and Trend Insights.",
    );
  }

  // The routes in this app pass the system prompt as the first message with
  // role "assistant"; Anthropic's API wants it as a top-level `system` field.
  const [first, ...rest] = opts.messages;
  const hasLeadingSystem = first && first.role === "assistant";
  const system = hasLeadingSystem ? first.content : undefined;
  const conversation = hasLeadingSystem ? rest : opts.messages;

  const res = await fetch(cfg.anthropic_api_url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.anthropic_model,
      max_tokens: 2000,
      ...(system ? { system } : {}),
      messages: conversation.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI provider error (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n");

  return { choices: [{ message: { content: text } }] };
}

interface ImagesGenerationsCreateOptions {
  prompt: string;
  size?: string;
}

async function imagesGenerationsCreate(opts: ImagesGenerationsCreateOptions) {
  const cfg = await getSettings(["openai_api_key", "openai_image_model", "openai_api_url"]);
  const apiKey = cfg.openai_api_key;
  if (!apiKey) {
    throw new Error(
      "Image generation isn't configured. A platform admin can add an OpenAI API key under Admin > Integrations to enable concept sketches in Style Assist.",
    );
  }

  const res = await fetch(cfg.openai_api_url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.openai_image_model,
      prompt: opts.prompt,
      size: "1024x1536",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Image provider error (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const base64 = data?.data?.[0]?.b64_json;
  return { data: [{ base64 }] };
}

const ZAI = {
  async create() {
    return {
      chat: { completions: { create: chatCompletionsCreate } },
      images: { generations: { create: imagesGenerationsCreate } },
    };
  },
};

export default ZAI;
