import { getPool } from "@/lib/db/pool";
import { getSystemAdminSession } from "@/lib/db/session";
import { json } from "./http";

/** Returns the signed-in platform admin, or a ready-made 401 response. */
export async function requireAdmin() {
  const session = await getSystemAdminSession();
  return session ? { session } : { error: json({ error: "Unauthorized" }, 401) };
}

export async function audit(adminId: string, action: string, details: Record<string, unknown>) {
  await getPool().query(`insert into public.system_platform_audit_log (admin_id, action, entity, details) values ($1, $2, 'academy', $3::jsonb)`,
    [adminId, action, JSON.stringify(details)]).catch(() => undefined);
}

const RESERVED = new Set(["me", "sign-in", "live", "learn", "verify"]);
export function slugify(s: string) {
  const slug = s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "course";
  return RESERVED.has(slug) ? `${slug}-course` : slug; // these paths are used by Academy pages
}
