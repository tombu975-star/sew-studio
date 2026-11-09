import { cookies, headers } from "next/headers";
import { AppClient } from "@/lib/db/appClient";

/**
 * Request-scoped database client, bound to the caller's session cookie.
 * Every query runs as the signed-in user inside Postgres, so row-level
 * security enforces the tenant boundary exactly as before.
 *
 * (File and function names are kept so existing routes need no changes.)
 */
export async function createRequestClient(options: { rememberMe?: boolean } = {}) {
  const store = await cookies();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  return new AppClient(
    "authenticated",
    {
      get: (name) => store.get(name)?.value,
      set: (name, value, opts) => store.set(name, value, opts as Parameters<typeof store.set>[2]),
      delete: (name) => store.delete(name),
    },
    { rememberMe: options.rememberMe, ip }
  );
}
