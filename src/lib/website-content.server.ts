import { getPool } from "@/lib/db/pool";
import { DEFAULT_WEBSITE_CONTENT, resolveWebsiteContent, type WebsiteContent } from "@/lib/website-content";

// Short in-memory cache so every public page view does not hit the database.
// Saving from the admin portal clears it; other server instances pick up the
// change within TTL_MS.
const TTL_MS = 10_000;
const g = globalThis as unknown as { __sewWebsiteContent?: { at: number; value: WebsiteContent } };

export function invalidateWebsiteContentCache() {
  g.__sewWebsiteContent = undefined;
}

/** Reads the live website content; falls back to defaults if the DB is unavailable. */
export async function loadWebsiteContent(): Promise<WebsiteContent> {
  const cached = g.__sewWebsiteContent;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const { rows } = await getPool().query(
      "select content from public.system_website_content where singleton = true"
    );
    const value = resolveWebsiteContent(rows[0]?.content);
    g.__sewWebsiteContent = { at: Date.now(), value };
    return value;
  } catch (error) {
    console.error("[website] could not load content, using defaults", error);
    return DEFAULT_WEBSITE_CONTENT;
  }
}

function originFromRequest(req: Request): string {
  try {
    const url = new URL(req.url);
    // Behind Railway's proxy the request URL can carry an internal host or an
    // http scheme; the forwarded headers describe what the visitor actually used.
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
    const proto = (req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")).split(",")[0].trim();
    return `${proto}://${host.split(",")[0].trim()}`;
  } catch {
    return "";
  }
}

/**
 * The public address of the app, without a trailing slash. Used for links in
 * emails and certificates. Order: the address an admin saved in /admin/website,
 * then NEXT_PUBLIC_APP_URL, then the address of the current request.
 */
export async function getAppBaseUrl(req?: Request): Promise<string> {
  const { site } = await loadWebsiteContent();
  const configured = (site.appUrl || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return req ? originFromRequest(req).replace(/\/+$/, "") : "";
}
