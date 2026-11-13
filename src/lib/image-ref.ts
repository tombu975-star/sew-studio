// A stored picture reference is either a file uploaded through /api/uploads
// ("/api/files/<uuid>") or an ordinary web link. Anything else is refused.
const UPLOADED = /^\/api\/files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\?[^\s]*)?$/i;
const WEB_LINK = /^https?:\/\/\S+$/i;

export function isValidImageRef(value: string): boolean {
  return UPLOADED.test(value) || WEB_LINK.test(value);
}

/** Returns the cleaned reference, null for empty, or undefined when invalid. */
export function cleanImageRef(input: unknown): string | null | undefined {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return null;
  return isValidImageRef(raw) && raw.length <= 1000 ? raw : undefined;
}
