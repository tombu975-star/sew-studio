import {
  EXTENDED_FIELDS,
  SHOULDER_SLOPES,
  GARMENT_TYPES,
  SET_STATUSES,
  APPROVAL_STATES,
} from "@/lib/measurements";

type Body = Record<string, unknown>;

/** request-body key → dedicated column, for the original ISO-8559 core fields. */
const CORE_COLUMNS: Record<string, string> = {
  bust: "bust",
  waist: "waist",
  hip: "hip",
  shoulder: "shoulder",
  length: "length",
  sleeve: "sleeve",
  inseam: "inseam",
  neck: "neck",
  height: "height",
  weight: "weight",
  acrossBack: "across_back",
  bustPoint: "bust_point",
  shoulderToBust: "shoulder_to_bust",
  underbust: "underbust",
  backLength: "back_length",
  frontLength: "front_length",
  upperArm: "upper_arm",
  wrist: "wrist",
  waistToHip: "waist_to_hip",
  crotchDepth: "crotch_depth",
  thigh: "thigh",
  knee: "knee",
  ankle: "ankle",
  outseam: "outseam",
};

export type MeasurementInput =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

type Parsed = { ok: true; value: number | null } | { ok: false };

/** Blank → null (cleared). Non-numeric, negative or absurd values are rejected, not silently dropped. */
function parseMeasure(v: unknown): Parsed {
  if (v === null || v === undefined || v === "") return { ok: true, value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1000) return { ok: false };
  return { ok: true, value: n };
}

function cleanText(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

function has(body: Body, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function checkEnum<T extends string>(
  value: unknown,
  allowed: readonly T[]
): { ok: true; value: T | null } | { ok: false } {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? { ok: true, value: value as T }
    : { ok: false };
}

/**
 * Build the columns to write for a measurement set.
 *
 * partial=false (create): every field is written, blanks become null/defaults.
 * partial=true  (update): only fields actually present in the body are touched,
 *   so "just confirm this set" can't wipe the measurements.
 *
 * Extended measurements live in one jsonb column, so they're rewritten as a
 * whole: a request containing ANY extended key is treated as a full-form
 * submission (blank ones clear), while a request containing none leaves the
 * stored extended values alone.
 */
export function buildMeasurementData(body: Body, opts: { partial: boolean }): MeasurementInput {
  const { partial } = opts;
  const data: Record<string, unknown> = {};

  for (const [key, column] of Object.entries(CORE_COLUMNS)) {
    if (partial && !has(body, key)) continue;
    const r = parseMeasure(body[key]);
    if (!r.ok) return { ok: false, error: `"${key}" must be a number between 0 and 1000.` };
    data[column] = r.value;
  }

  const anyExtended = EXTENDED_FIELDS.some((f) => has(body, f.key));
  if (!partial || anyExtended) {
    const extended: Record<string, number> = {};
    for (const f of EXTENDED_FIELDS) {
      const r = parseMeasure(body[f.key]);
      if (!r.ok) return { ok: false, error: `"${f.label}" must be a number between 0 and 1000.` };
      if (r.value !== null) extended[f.key] = r.value;
    }
    data.extended = extended;
  }

  if (!partial || has(body, "posture")) data.posture = cleanText(body.posture, 60);
  if (!partial || has(body, "notes")) data.notes = cleanText(body.notes, 4000);
  if (!partial || has(body, "customMeasurements"))
    data.custom_measurements = cleanText(body.customMeasurements, 4000);
  if (!partial || has(body, "setName")) data.set_name = cleanText(body.setName, 120);

  if (!partial || has(body, "shoulderSlope")) {
    const r = checkEnum(body.shoulderSlope, SHOULDER_SLOPES);
    if (!r.ok) return { ok: false, error: "Invalid shoulder slope." };
    data.shoulder_slope = r.value;
  }
  if (!partial || has(body, "garmentType")) {
    const r = checkEnum(body.garmentType, GARMENT_TYPES);
    if (!r.ok) return { ok: false, error: "Invalid garment type." };
    data.garment_type = r.value ?? "General";
  }
  if (!partial || has(body, "status")) {
    const r = checkEnum(body.status, SET_STATUSES);
    if (!r.ok) return { ok: false, error: "Invalid status." };
    // Sessions have always been the working record the moment they are saved,
    // so an unspecified status means Confirmed; "Draft" is opt-in.
    data.status = r.value ?? "Confirmed";
  }
  if (!partial || has(body, "customerApproval")) {
    const r = checkEnum(body.customerApproval, APPROVAL_STATES);
    if (!r.ok) return { ok: false, error: "Invalid customer approval value." };
    data.customer_approval = r.value ?? "Pending";
  }

  if (!partial || has(body, "dateTaken")) {
    const d = body.dateTaken ? new Date(String(body.dateTaken)) : new Date();
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Invalid date." };
    data.date_taken = d.toISOString();
  }

  return { ok: true, data };
}
