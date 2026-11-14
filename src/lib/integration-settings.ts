import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { getPool } from "@/lib/db/pool";

/**
 * Integration settings a platform admin can edit in /admin/integrations:
 * email delivery, the customer-notification webhook, AI keys, and the web
 * addresses of those services.
 *
 * Resolution order for every setting:
 *   1. a value saved by an admin (database)
 *   2. the matching environment variable on the Railway service
 *   3. the built-in default (if any)
 *
 * Secret values are encrypted with AES-256-GCM before they are stored and are
 * never sent back to the browser (only a "set" flag and the last 4 characters).
 * Set SETTINGS_ENCRYPTION_KEY on the service for a dedicated key; without it the
 * key is derived from DATABASE_URL, so a copy of the database alone cannot
 * decrypt the secrets.
 */

export type SettingGroup = "email" | "notifications" | "ai";
export type SettingKind = "text" | "url" | "number" | "bool" | "secret";

export interface SettingDef {
  key: string;
  env?: string;
  group: SettingGroup;
  kind: SettingKind;
  label: string;
  help?: string;
  placeholder?: string;
  default?: string;
  /** Shown under "Advanced" in the admin page. */
  advanced?: boolean;
}

export const SETTING_DEFS: SettingDef[] = [
  // ── Email ────────────────────────────────────────────────────────────────
  { key: "email_from", env: "EMAIL_FROM", group: "email", kind: "text", label: "Sender (From)", placeholder: "Sewsiness <no-reply@yourdomain.com>", help: "Shown as the sender of every email. For Resend the domain must be verified there." },
  { key: "resend_api_key", env: "RESEND_API_KEY", group: "email", kind: "secret", label: "Resend API key", help: "Option A (recommended for a custom domain). Used first when set." },
  { key: "smtp_host", env: "SMTP_HOST", group: "email", kind: "text", label: "SMTP host", placeholder: "smtp.gmail.com", help: "Option B: any mailbox provider (Gmail, Zoho, Brevo…)." },
  { key: "smtp_port", env: "SMTP_PORT", group: "email", kind: "number", label: "SMTP port", default: "465", placeholder: "465" },
  { key: "smtp_secure", env: "SMTP_SECURE", group: "email", kind: "bool", label: "Use SSL/TLS", help: "Leave on automatic unless your provider says otherwise (port 465 uses SSL)." },
  { key: "smtp_user", env: "SMTP_USER", group: "email", kind: "text", label: "SMTP username", placeholder: "you@gmail.com" },
  { key: "smtp_pass", env: "SMTP_PASS", group: "email", kind: "secret", label: "SMTP password", help: "For Gmail use an App password, not your normal password." },
  { key: "resend_api_url", env: "RESEND_API_URL", group: "email", kind: "url", label: "Resend API address", default: "https://api.resend.com/emails", advanced: true },

  // ── Customer notifications (WhatsApp / SMS / email via Google Apps Script) ─
  { key: "apps_script_url", env: "GOOGLE_APPS_SCRIPT_URL", group: "notifications", kind: "url", label: "Apps Script web app address", placeholder: "https://script.google.com/macros/s/…/exec", help: "Customer order updates are sent through this web app. Also used as an email fallback." },
  { key: "apps_script_secret", env: "GOOGLE_APPS_SCRIPT_SECRET", group: "notifications", kind: "secret", label: "Apps Script shared secret", help: "Must match the secret inside your script." },

  // ── AI ───────────────────────────────────────────────────────────────────
  { key: "anthropic_api_key", env: "ANTHROPIC_API_KEY", group: "ai", kind: "secret", label: "Anthropic API key", help: "Powers Style Assist concepts and Trend Insights." },
  { key: "anthropic_model", env: "ANTHROPIC_MODEL", group: "ai", kind: "text", label: "Anthropic model", default: "claude-sonnet-4-6" },
  { key: "openai_api_key", env: "OPENAI_API_KEY", group: "ai", kind: "secret", label: "OpenAI API key", help: "Powers Style Assist concept sketches (image generation)." },
  { key: "openai_image_model", env: "OPENAI_IMAGE_MODEL", group: "ai", kind: "text", label: "OpenAI image model", default: "gpt-image-1" },
  { key: "anthropic_api_url", env: "ANTHROPIC_API_URL", group: "ai", kind: "url", label: "Anthropic API address", default: "https://api.anthropic.com/v1/messages", advanced: true },
  { key: "openai_api_url", env: "OPENAI_API_URL", group: "ai", kind: "url", label: "OpenAI images API address", default: "https://api.openai.com/v1/images/generations", advanced: true },
];

const DEF_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]));
export const isSecretKey = (key: string) => DEF_BY_KEY.get(key)?.kind === "secret";

// ── Encryption ─────────────────────────────────────────────────────────────

export function usingFallbackEncryptionKey(): boolean {
  return !process.env.SETTINGS_ENCRYPTION_KEY;
}

function encryptionKey(): Buffer {
  const material = process.env.SETTINGS_ENCRYPTION_KEY || process.env.DATABASE_URL;
  if (!material) throw new Error("Set SETTINGS_ENCRYPTION_KEY (or DATABASE_URL) so secrets can be encrypted.");
  return scryptSync(material, "sewsiness-integration-settings-v1", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}

/** Returns null when the value cannot be decrypted (for example the key changed). */
export function decryptSecret(blob: string): string | null {
  try {
    const [v, iv, tag, data] = blob.split(":");
    if (v !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ── Reading ────────────────────────────────────────────────────────────────

interface StoredRow { key: string; value: string; unreadable: boolean; updatedAt: string | null }
const TTL_MS = 10_000;
const g = globalThis as unknown as { __sewSettings?: { at: number; rows: Map<string, StoredRow> } };

export function invalidateSettingsCache() {
  g.__sewSettings = undefined;
}

async function loadRows(): Promise<Map<string, StoredRow>> {
  const cached = g.__sewSettings;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rows;
  const rows = new Map<string, StoredRow>();
  try {
    const { rows: dbRows } = await getPool().query(
      `select key, value, is_secret as "isSecret", updated_at as "updatedAt" from public.system_integration_settings`
    );
    for (const r of dbRows as { key: string; value: string; isSecret: boolean; updatedAt: string }[]) {
      if (r.isSecret) {
        const plain = r.value ? decryptSecret(r.value) : "";
        rows.set(r.key, { key: r.key, value: plain ?? "", unreadable: plain === null, updatedAt: r.updatedAt });
      } else {
        rows.set(r.key, { key: r.key, value: r.value, unreadable: false, updatedAt: r.updatedAt });
      }
    }
  } catch (error) {
    // Table missing (migration not applied yet) or DB down: behave as if nothing is saved.
    console.error("[settings] could not read integration settings, using environment values", error);
  }
  g.__sewSettings = { at: Date.now(), rows };
  return rows;
}

export type SettingSource = "admin" | "environment" | "default" | "none";

function resolveOne(def: SettingDef, rows: Map<string, StoredRow>): { value: string; source: SettingSource } {
  const stored = rows.get(def.key)?.value?.trim();
  if (stored) return { value: stored, source: "admin" };
  const fromEnv = def.env ? process.env[def.env]?.trim() : "";
  if (fromEnv) return { value: fromEnv, source: "environment" };
  if (def.default) return { value: def.default, source: "default" };
  return { value: "", source: "none" };
}

/** Effective values for several settings at once. Never throws. */
export async function getSettings<K extends string>(keys: readonly K[]): Promise<Record<K, string>> {
  const rows = await loadRows();
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const def = DEF_BY_KEY.get(key);
    out[key] = def ? resolveOne(def, rows).value : "";
  }
  return out;
}

export async function getSetting(key: string): Promise<string> {
  return (await getSettings([key]))[key];
}

// ── What the admin page sees (secrets are never included) ───────────────────

export interface SettingView {
  key: string;
  group: SettingGroup;
  kind: SettingKind;
  label: string;
  help?: string;
  placeholder?: string;
  advanced: boolean;
  /** The value saved by an admin (empty for secrets). */
  value: string;
  /** What the app is using right now, for non-secret values. */
  effective: string;
  source: SettingSource;
  /** Secrets: whether any value is available, and its last 4 characters. */
  secretSet: boolean;
  secretHint: string;
  /** A saved secret exists but cannot be decrypted (the encryption key changed). Re-enter it. */
  unreadable: boolean;
  updatedAt: string | null;
}

export async function describeSettings(): Promise<SettingView[]> {
  invalidateSettingsCache();
  const rows = await loadRows();
  return SETTING_DEFS.map((def) => {
    const stored = rows.get(def.key);
    const { value, source } = resolveOne(def, rows);
    const secret = def.kind === "secret";
    return {
      key: def.key,
      group: def.group,
      kind: def.kind,
      label: def.label,
      help: def.help,
      placeholder: def.placeholder,
      advanced: Boolean(def.advanced),
      value: secret ? "" : stored?.value ?? "",
      effective: secret ? "" : value,
      source,
      secretSet: secret && Boolean(value),
      secretHint: secret && value ? value.slice(-4) : "",
      unreadable: Boolean(stored?.unreadable),
      updatedAt: stored?.updatedAt ?? null,
    };
  });
}

// ── Validation and saving ───────────────────────────────────────────────────

/** Returns an error message, or null when the value is acceptable. */
export function validateSetting(def: SettingDef, raw: string): string | null {
  const v = raw.trim();
  if (v === "") return null;
  if (v.length > (def.kind === "secret" ? 1000 : 500)) return `${def.label} is too long.`;
  if (/[\r\n]/.test(v)) return `${def.label} must be a single line.`;
  switch (def.kind) {
    case "url":
      return /^https:\/\/[^\s]+$/i.test(v) ? null : `${def.label} must start with https://`;
    case "number": {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 65535 ? null : `${def.label} must be a whole number between 1 and 65535.`;
    }
    case "bool":
      return v === "true" || v === "false" ? null : `${def.label} must be on or off.`;
    default:
      return null;
  }
}

export interface SaveInput {
  /** key → new value. For secrets an empty/missing entry keeps the saved value. */
  values: Record<string, string>;
  /** Keys to remove, falling back to the environment variable / default. */
  clear: string[];
}

export async function saveSettings(adminId: string, input: SaveInput): Promise<{ error?: string; changed: string[] }> {
  const changed: string[] = [];
  const upserts: { def: SettingDef; value: string }[] = [];
  for (const [key, raw] of Object.entries(input.values)) {
    const def = DEF_BY_KEY.get(key);
    if (!def) return { error: `Unknown setting: ${key}`, changed: [] };
    const value = typeof raw === "string" ? raw.trim() : "";
    if (def.kind === "secret" && value === "") continue; // keep the saved secret
    const problem = validateSetting(def, value);
    if (problem) return { error: problem, changed: [] };
    upserts.push({ def, value });
  }
  const clears = input.clear.filter((k) => DEF_BY_KEY.has(k));

  const client = await getPool().connect();
  try {
    await client.query("begin");
    for (const { def, value } of upserts) {
      if (value === "") {
        await client.query("delete from public.system_integration_settings where key = $1", [def.key]);
      } else {
        const stored = def.kind === "secret" ? encryptSecret(value) : value;
        await client.query(
          `insert into public.system_integration_settings (key, value, is_secret, updated_at, updated_by)
           values ($1, $2, $3, now(), $4)
           on conflict (key) do update
             set value = excluded.value, is_secret = excluded.is_secret, updated_at = now(), updated_by = excluded.updated_by`,
          [def.key, stored, def.kind === "secret", adminId]
        );
      }
      changed.push(def.key);
    }
    for (const key of clears) {
      await client.query("delete from public.system_integration_settings where key = $1", [key]);
      changed.push(key);
    }
    if (changed.length) {
      // Key names only. Values are never written to the audit log.
      await client.query(
        `insert into public.system_platform_audit_log (admin_id, action, entity, details)
         values ($1, 'integrations.updated', 'integration_settings', $2::jsonb)`,
        [adminId, JSON.stringify({ keys: [...new Set(changed)] })]
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  invalidateSettingsCache();
  return { changed };
}
