import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One account per email address and one account per phone number.
 *
 * The database enforces this (supabase/0013_unique_email_phone.sql); this file
 * mirrors its normalisation so the API can give a friendly message BEFORE it
 * creates a sign-in, instead of failing half-way through.
 *
 * Keep normalizeEmail / normalizePhone identical to the SQL functions of the
 * same name.
 */

/** Gmail ignores dots and "+tags", and googlemail.com is the same inbox. */
export function normalizeEmail(raw: unknown): string | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  const at = v.indexOf("@");
  if (at < 0) return v;
  let local = v.slice(0, at);
  let domain = v.slice(at + 1);
  // match SQL split_part(v,'@',2): only the part between the first and second '@'
  domain = domain.split("@")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0].replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

export function isGmail(raw: unknown): boolean {
  const key = normalizeEmail(raw);
  return !!key && key.endsWith("@gmail.com");
}

/** Digits only; 00233… and Ghana's local 0XXXXXXXXX both become 233XXXXXXXXX. */
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "233" + d.slice(1);
  return d;
}

/** A phone is usable if it has a plausible number of digits (7–15). */
export function isPlausiblePhone(raw: unknown): boolean {
  const d = normalizePhone(raw);
  return !!d && d.length >= 7 && d.length <= 15;
}

export const MESSAGES = {
  email: "That email is already used by another account.",
  gmail:
    "That Gmail address already belongs to another account. Gmail ignores dots and “+” tags, so name+1@gmail.com is the same inbox as name@gmail.com.",
  phone: "That phone number is already used by another account.",
  badPhone: "Please enter a valid phone number.",
} as const;

export function emailTakenMessage(email: unknown): string {
  return isGmail(email) ? MESSAGES.gmail : MESSAGES.email;
}

export type IdentityConflict = { field: "email" | "phone"; message: string };

/**
 * Is this email / phone already used by ANY account (shop owner, team member
 * or freelancer)? `excludeId` is the account being edited, so it doesn't
 * collide with itself. Returns null when it's free — and also when the
 * database hasn't had migration 0013 applied yet (the columns don't exist),
 * so the app keeps working until it's run.
 */
export async function findIdentityConflict(
  admin: SupabaseClient,
  opts: { email?: unknown; phone?: unknown; excludeId?: string }
): Promise<IdentityConflict | null> {
  const emailKey = opts.email !== undefined ? normalizeEmail(opts.email) : null;
  const phoneKey = opts.phone !== undefined ? normalizePhone(opts.phone) : null;

  for (const table of ["profiles", "freelancer_profiles"] as const) {
    if (emailKey) {
      let q = admin.from(table).select("id").eq("email_key", emailKey).limit(1);
      if (opts.excludeId) q = q.neq("id", opts.excludeId);
      const { data, error } = await q;
      if (error) return null; // migration 0013 not applied yet
      if (data && data.length) return { field: "email", message: emailTakenMessage(opts.email) };
    }
    if (phoneKey) {
      let q = admin.from(table).select("id").eq("phone_key", phoneKey).limit(1);
      if (opts.excludeId) q = q.neq("id", opts.excludeId);
      const { data, error } = await q;
      if (error) return null;
      if (data && data.length) return { field: "phone", message: MESSAGES.phone };
    }
  }
  return null;
}

/** Turn the database's email_taken / phone_taken errors into friendly text. */
export function identityErrorMessage(err: unknown, email?: unknown): string | null {
  const e = err as { code?: string; message?: string } | null;
  const msg = e?.message ?? "";
  if (e?.code === "23505" || msg.includes("email_taken") || msg.includes("phone_taken")) {
    if (msg.includes("phone_taken") || msg.includes("phone_key")) return MESSAGES.phone;
    if (msg.includes("email_taken") || msg.includes("email_key") || msg.includes("email")) {
      return emailTakenMessage(email);
    }
  }
  return null;
}
