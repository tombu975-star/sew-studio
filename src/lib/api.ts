// Lightweight fetch helpers for the atelier API.

let onSessionExpired: (() => void) | null = null;

/** Register a callback fired when any API call returns 401 (session expired). */
export function setOnSessionExpired(cb: () => void) {
  onSessionExpired = cb;
}

// Without a timeout, a stalled connection (very common on mobile — wifi/
// cellular handoff, a backgrounded tab mid-request) leaves fetch() hanging
// forever: no error, no response, the calling mutation stuck "pending"
// indefinitely with no way out except a page refresh. 20s is generous for
// a slow connection but still finite.
const DEFAULT_TIMEOUT_MS = 20_000;

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(
        "That's taking too long — check your connection and try again."
      );
    }
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new Error(
      "Couldn't reach the server. Check your connection and try again."
    );
  }

  if (!res.ok) {
    // On 401, the session has expired — trigger a global re-auth.
    if (res.status === 401 && onSessionExpired && !path.includes("/auth/")) {
      onSessionExpired();
    }
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${text}`);
  }
  return res.json() as Promise<T>;
}

export const apiGet = <T,>(path: string) => api<T>(path);

export const apiPost = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });

export const apiPatch = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiDelete = <T = { ok: boolean }>(path: string) =>
  api<T>(path, { method: "DELETE" });

/**
 * The friendly text from a failed API call. api() throws
 * "409 Conflict — {"error":"…"}"; this returns just the "…" part.
 */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = err instanceof Error ? err.message : "";
  const start = raw.indexOf("{");
  if (start >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(start));
      if (parsed?.error) return String(parsed.error);
    } catch {
      /* not JSON */
    }
  }
  return fallback;
}
