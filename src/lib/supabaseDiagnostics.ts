/**
 * Works out why the site can't sign people in, without ever exposing a secret.
 * Used by GET /api/admin-auth/status. It reports only yes/no answers, the
 * public project address, and plain-English hints.
 */

export type SupabaseDiagnosis = {
  configured: { url: boolean; anonKey: boolean; serviceKey: boolean };
  host: string | null;
  keyInfo: { role: string | null; project: string | null } | null;
  supabase: { reachable: boolean; status?: number; emailSignInEnabled?: boolean; error?: string } | null;
  ok: boolean;
  hints: string[];
};

/** Reads the (non-secret) claims inside a Supabase JWT key: which role and which project. */
export function readKeyClaims(key: string): { role: string | null; project: string | null } | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null; // new-style "sb_publishable_…" keys aren't JWTs
  try {
    const json = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return { role: json.role ?? null, project: json.ref ?? null };
  } catch {
    return null;
  }
}

export async function diagnoseSupabase(
  env: { url?: string; anonKey?: string; serviceKey?: string },
  fetchImpl: typeof fetch = fetch
): Promise<SupabaseDiagnosis> {
  const url = (env.url ?? "").trim();
  const anonKey = (env.anonKey ?? "").trim();
  const hints: string[] = [];
  const out: SupabaseDiagnosis = {
    configured: { url: !!url, anonKey: !!anonKey, serviceKey: !!(env.serviceKey ?? "").trim() },
    host: null,
    keyInfo: null,
    supabase: null,
    ok: false,
    hints,
  };

  if (!url || !anonKey) {
    if (!url) hints.push("NEXT_PUBLIC_SUPABASE_URL is not set on the server.");
    if (!anonKey) hints.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set on the server.");
    hints.push(
      "Add them in your host's environment settings, then REDEPLOY. NEXT_PUBLIC_ variables are baked in when the site is built, so changing them without a new build changes nothing."
    );
    return out;
  }
  if (!env.serviceKey) hints.push("SUPABASE_SERVICE_ROLE_KEY is not set (needed for creating accounts, not for signing in).");

  let host: string;
  try {
    host = new URL(url).host;
    out.host = host;
  } catch {
    hints.push("NEXT_PUBLIC_SUPABASE_URL isn't a valid web address. It should look like https://abcdxyz.supabase.co");
    return out;
  }
  if (!url.startsWith("https://") || /\/(rest|auth)\//.test(url) || url.endsWith("/")) {
    hints.push("NEXT_PUBLIC_SUPABASE_URL should be just https://<project>.supabase.co — no trailing slash and no /rest/v1 or /auth/v1 on the end.");
  }

  out.keyInfo = readKeyClaims(anonKey);
  if (out.keyInfo?.role === "service_role") {
    hints.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY contains the SERVICE ROLE key. Replace it with the anon/public key — and because NEXT_PUBLIC_ values are sent to every visitor's browser, rotate the service role key in Supabase (Project Settings → API) as well."
    );
  }
  const urlProject = host.split(".")[0];
  if (out.keyInfo?.project && out.keyInfo.project !== urlProject) {
    hints.push(
      `The anon key belongs to project "${out.keyInfo.project}" but the URL is for "${urlProject}". They must come from the same Supabase project.`
    );
  }

  try {
    const res = await fetchImpl(`${url.replace(/\/+$/, "")}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(8000),
    });
    out.supabase = { reachable: true, status: res.status };
    if (res.status === 401 || res.status === 403) {
      hints.push("Supabase rejected the anon key. Copy it again from Project Settings → API (the 'anon' / 'public' key), update NEXT_PUBLIC_SUPABASE_ANON_KEY and redeploy.");
    } else if (res.status === 200) {
      const body = (await res.json().catch(() => null)) as { external?: { email?: boolean } } | null;
      if (body?.external && typeof body.external.email === "boolean") {
        out.supabase.emailSignInEnabled = body.external.email;
        if (!body.external.email) {
          hints.push("Email sign-in is switched OFF in your Supabase project. Turn it on under Authentication → Sign In / Providers → Email.");
        }
      }
    } else {
      hints.push(`Supabase answered with HTTP ${res.status}. If that's 5xx, the project may be paused or having an outage.`);
    }
  } catch (e) {
    const err = e as { cause?: { code?: string }; message?: string; name?: string };
    const why = err.cause?.code || err.name || err.message || "network error";
    out.supabase = { reachable: false, error: String(why) };
    hints.push(
      `The server could not connect to ${host} (${why}). Either the URL is wrong, or the project is PAUSED — free Supabase projects pause after about a week of inactivity. Open the Supabase dashboard and click "Restore project".`
    );
  }

  out.ok = hints.filter((h) => !h.startsWith("SUPABASE_SERVICE_ROLE_KEY")).length === 0 && out.supabase?.reachable === true;
  if (out.ok) {
    hints.push(
      "The site can reach Supabase and the key is accepted. If /admin still says invalid email or password, the admin sign-in doesn't exist in THIS project or the password differs: run  npm run create-admin -- --check <email> <password>"
    );
  }
  return out;
}
