import { randomBytes, randomInt } from "crypto";

export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_TOO_SHORT = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** Unambiguous characters only (no 0/O, 1/l/I) so a temporary password is easy to read out. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Cryptographically random temporary password (default 12 chars, ~70 bits). */
export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** 256-bit URL-safe token for customer portal links. */
export function generatePortalToken(): string {
  return randomBytes(32).toString("base64url");
}
