import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client, bound to the current request's cookies.
 * Every API route should use this (not the admin client) for normal
 * reads/writes — it carries the signed-in user's session, so Row Level
 * Security applies exactly as it would for that user. This is what makes
 * the app "a normal Supabase project": Postgres enforces the tenant
 * boundary, not application code.
 *
 * Must be called inside a Route Handler (or Server Component, read-only
 * there) — relies on next/headers `cookies()`.
 */
export async function createServerSupabaseClient(options: { rememberMe?: boolean } = {}) {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: options.rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {},
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a context that can't set cookies (e.g. a Server
            // Component render) — safe to ignore, middleware.ts refreshes
            // the session cookie on the next request instead.
          }
        },
      },
    }
  );
}
