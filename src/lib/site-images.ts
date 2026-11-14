/** Sniffs the real type of an uploaded picture so a wrong Content-Type cannot sneak a non-image in. */
export function sniffImageType(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (b.length > 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString("ascii"))) return "image/gif";
  return null;
}
export const MAX_SITE_IMAGE_BYTES = 5 * 1024 * 1024;
