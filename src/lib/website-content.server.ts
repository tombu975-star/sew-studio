import { getPool } from "@/lib/db/pool";
import { DEFAULT_WEBSITE_CONTENT, resolveWebsiteContent, type WebsiteContent } from "@/lib/website-content";

/** Reads the live website content; falls back to defaults if the DB is unavailable. */
export async function loadWebsiteContent(): Promise<WebsiteContent> {
  try {
    const { rows } = await getPool().query(
      "select content from public.system_website_content where singleton = true"
    );
    return resolveWebsiteContent(rows[0]?.content);
  } catch (error) {
    console.error("[website] could not load content, using defaults", error);
    return DEFAULT_WEBSITE_CONTENT;
  }
}
