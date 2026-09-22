// Drop-in replacement for `z-ai-web-dev-sdk`.
//
// The original SDK only reads credentials from a `.z-ai-config` file on disk
// (project dir, home dir, or /etc) — see its README. That file only exists
// inside the z.ai sandbox that generated this app, is gitignored, and is
// never deployed. On Vercel (or anywhere else) `ZAI.create()` therefore
// always throws "Configuration file not found", so every route that used it
// (Style Assist generate/visualize, Trend Insights) failed on every request.
//
// This module exposes the same shape the routes already call
// (`zai.chat.completions.create(...)`, `zai.images.generations.create(...)`)
// but backed by standard, publicly documented APIs configured with
// environment variables you set in the Vercel dashboard:
//
//   ANTHROPIC_API_KEY  — powers chat/JSON generation (Style Assist concepts,
//                        Trend Insights). Get one at https://console.anthropic.com
//   OPENAI_API_KEY     — powers the concept-sketch image generation in
//                        Style Assist "visualize". Get one at
//                        https://platform.openai.com
//
// Swap either implementation below for a different provider if you'd
// rather use one you already have a key for — both are isolated to a
// single function.

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatCompletionsCreateOptions {
  messages: ChatMessage[];
  thinking?: unknown;
}

async function chatCompletionsCreate(opts: ChatCompletionsCreateOptions) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI text generation isn't configured: set ANTHROPIC_API_KEY in your Vercel project's Environment Variables to enable Style Assist and Trend Insights.",
    );
  }

  // The routes in this app pass the system prompt as the first message with
  // role "assistant"; Anthropic's API wants it as a top-level `system` field.
  const [first, ...rest] = opts.messages;
  const hasLeadingSystem = first && first.role === "assistant";
  const system = hasLeadingSystem ? first.content : undefined;
  const conversation = hasLeadingSystem ? rest : opts.messages;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Image generation isn't configured: set OPENAI_API_KEY in your Vercel project's Environment Variables to enable Style Assist's concept sketches.",
    );
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
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
