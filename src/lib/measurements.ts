/**
 * Body measurement standard used across the app.
 *
 * Landmarks and dimension names follow the anthropometric approach of
 * ISO 8559-1 (garment construction and anthropometric surveys — body
 * dimensions): girths are taken with the tape horizontal and snug but not
 * compressing, lengths are taken along the body surface between named
 * landmarks, and everything is recorded on the bare or lightly-clothed
 * body. Sizes are designated by body dimensions in centimetres in the
 * spirit of EN 13402, never by garment dimensions.
 *
 * Storage is ALWAYS centimetres (ISO/SI). The cm / in switch only changes
 * how values are entered and displayed.
 */

export type Unit = "cm" | "in";

export type FieldGroup = "Stature" | "Upper body" | "Arm" | "Lower body";

export interface MeasurementField {
  /** camelCase key used in the API / MeasurementSet type. */
  key: MeasurementKey;
  label: string;
  group: FieldGroup;
  /** Plain-language instruction shown to whoever is holding the tape. */
  how: string;
  /** Plausible adult range in cm — outside this we warn (never block). */
  range: [number, number];
  /** Fields most garments need; shown first / marked as core. */
  core?: boolean;
  /** Stored in kg rather than cm. */
  unitOverride?: "kg";
}

export type MeasurementKey =
  | "height" | "weight"
  | "neck" | "shoulder" | "acrossBack" | "bust" | "bustPoint" | "shoulderToBust"
  | "underbust" | "waist" | "backLength" | "frontLength"
  | "sleeve" | "upperArm" | "wrist"
  | "hip" | "waistToHip" | "crotchDepth" | "thigh" | "knee" | "ankle"
  | "inseam" | "outseam" | "length";

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  // ── Stature ─────────────────────────────────────────────
  { key: "height", label: "Stature (height)", group: "Stature", core: true, range: [120, 210],
    how: "Standing barefoot against a wall, heels together. Vertical distance from floor to the top of the head." },
  { key: "weight", label: "Body mass (kg)", group: "Stature", range: [30, 250], unitOverride: "kg",
    how: "Optional. Recorded in kilograms." },

  // ── Upper body ──────────────────────────────────────────
  { key: "neck", label: "Neck girth", group: "Upper body", range: [26, 50],
    how: "Around the base of the neck, over the neck-base landmark, tape just touching the skin." },
  { key: "shoulder", label: "Across shoulder", group: "Upper body", core: true, range: [30, 60],
    how: "Straight across the back from one shoulder point (acromion) to the other." },
  { key: "acrossBack", label: "Across back", group: "Upper body", range: [26, 55],
    how: "Across the back at armpit level, between the two back armfold creases." },
  { key: "bust", label: "Bust girth", group: "Upper body", core: true, range: [60, 170],
    how: "Horizontal tape around the fullest part of the bust, level at the back, arms relaxed." },
  { key: "bustPoint", label: "Bust point to bust point", group: "Upper body", range: [10, 30],
    how: "Straight distance between the two bust points (nipple landmarks)." },
  { key: "shoulderToBust", label: "Shoulder to bust point", group: "Upper body", range: [15, 40],
    how: "From the shoulder-neck point down over the bust point." },
  { key: "underbust", label: "Underbust girth", group: "Upper body", range: [55, 150],
    how: "Horizontal tape directly beneath the bust, at the base of the breast." },
  { key: "waist", label: "Waist girth", group: "Upper body", core: true, range: [45, 170],
    how: "Horizontal tape at the natural waist — the narrowest part of the torso, between ribs and hips." },
  { key: "backLength", label: "Back length (nape to waist)", group: "Upper body", core: true, range: [30, 55],
    how: "From the prominent neck bone (cervicale) straight down the spine to the waist level." },
  { key: "frontLength", label: "Front length (shoulder to waist)", group: "Upper body", range: [30, 55],
    how: "From the shoulder-neck point over the bust point down to the waist." },

  // ── Arm ─────────────────────────────────────────────────
  { key: "sleeve", label: "Arm length (shoulder to wrist)", group: "Arm", core: true, range: [45, 80],
    how: "From the shoulder point over a slightly bent elbow to the wrist bone." },
  { key: "upperArm", label: "Upper arm girth", group: "Arm", range: [18, 50],
    how: "Around the fullest part of the upper arm, arm hanging relaxed." },
  { key: "wrist", label: "Wrist girth", group: "Arm", range: [12, 22],
    how: "Around the wrist just above the wrist bone." },

  // ── Lower body ──────────────────────────────────────────
  { key: "hip", label: "Hip girth", group: "Lower body", core: true, range: [70, 180],
    how: "Horizontal tape around the fullest part of the buttocks, feet together." },
  { key: "waistToHip", label: "Waist to hip", group: "Lower body", range: [12, 30],
    how: "Vertical distance at the side from waist level down to the fullest hip level." },
  { key: "crotchDepth", label: "Crotch depth (body rise)", group: "Lower body", range: [20, 40],
    how: "Seated on a flat stool: vertical distance from waist to the seat surface, measured at the side." },
  { key: "thigh", label: "Thigh girth", group: "Lower body", range: [35, 80],
    how: "Around the fullest part of the upper thigh, just below the buttock fold." },
  { key: "knee", label: "Knee girth", group: "Lower body", range: [26, 55],
    how: "Around the knee over the middle of the kneecap, leg straight." },
  { key: "ankle", label: "Ankle girth", group: "Lower body", range: [18, 34],
    how: "Around the narrowest part of the ankle." },
  { key: "inseam", label: "Inside leg (inseam)", group: "Lower body", core: true, range: [55, 100],
    how: "From the crotch point straight down the inside of the leg to the floor / ankle bone." },
  { key: "outseam", label: "Outside leg (waist to floor)", group: "Lower body", range: [85, 130],
    how: "From the natural waist down the outside of the leg to the floor." },
  { key: "length", label: "Garment length (as requested)", group: "Lower body", range: [20, 200],
    how: "The finished length the client wants for this garment, from the agreed start point." },
];

export const FIELD_GROUPS: FieldGroup[] = ["Stature", "Upper body", "Arm", "Lower body"];

export const FIELD_BY_KEY = Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, f])) as Record<
  MeasurementKey,
  MeasurementField
>;

export const POSTURES = ["Upright / neutral", "Forward-leaning", "Erect / swayback", "Uneven shoulders", "Other"] as const;

/* ── Unit handling ─────────────────────────────────────────── */

const CM_PER_IN = 2.54;

/** Any stored value → centimetres (stored unit is normally already cm). */
export function toCm(value: number | null | undefined, storedUnit: string): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return storedUnit === "in" ? value * CM_PER_IN : value;
}

/** Centimetres → display number for the chosen unit, 1 decimal max. */
export function fromCm(cm: number | null | undefined, unit: Unit): number | null {
  if (cm == null || Number.isNaN(cm)) return null;
  const v = unit === "in" ? cm / CM_PER_IN : cm;
  return Math.round(v * 10) / 10;
}

export function formatValue(cm: number | null | undefined, unit: Unit): string {
  const v = fromCm(cm, unit);
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** What the user typed (in `unit`) → cm, rounded to 1 decimal (ISO: 1 mm). */
export function inputToCm(text: string, unit: Unit): number | null {
  if (text.trim() === "") return null;
  const n = Number(text.replace(",", "."));
  if (Number.isNaN(n)) return null;
  const cm = unit === "in" ? n * CM_PER_IN : n;
  return Math.round(cm * 10) / 10;
}

/** Plausibility check — returns a warning message or null. */
export function checkRange(field: MeasurementField, cm: number | null): string | null {
  if (cm == null) return null;
  const [lo, hi] = field.range;
  if (cm < lo || cm > hi) {
    const unit = field.unitOverride ?? "cm";
    return `Usually ${lo}–${hi} ${unit}. Double-check this reading.`;
  }
  return null;
}

/* ── Size designation ──────────────────────────────────────── */

export interface SizeRow {
  eu: number;
  uk: number;
  us: number;
  bust: number;
  waist: number;
  hip: number;
}

/**
 * Women's body-dimension chart (cm), aligned with the 4 cm step principle
 * of EN 13402. Indicative only — bespoke garments are cut from the actual
 * measurements; this exists for quick reference and ready-to-wear
 * conversations.
 */
export const SIZE_CHART: SizeRow[] = [
  { eu: 32, uk: 4, us: 0, bust: 76, waist: 58, hip: 82 },
  { eu: 34, uk: 6, us: 2, bust: 80, waist: 62, hip: 86 },
  { eu: 36, uk: 8, us: 4, bust: 84, waist: 66, hip: 90 },
  { eu: 38, uk: 10, us: 6, bust: 88, waist: 70, hip: 94 },
  { eu: 40, uk: 12, us: 8, bust: 92, waist: 74, hip: 98 },
  { eu: 42, uk: 14, us: 10, bust: 96, waist: 78, hip: 102 },
  { eu: 44, uk: 16, us: 12, bust: 100, waist: 82, hip: 106 },
  { eu: 46, uk: 18, us: 14, bust: 106, waist: 88, hip: 112 },
  { eu: 48, uk: 20, us: 16, bust: 112, waist: 94, hip: 118 },
  { eu: 50, uk: 22, us: 18, bust: 118, waist: 100, hip: 124 },
  { eu: 52, uk: 24, us: 20, bust: 124, waist: 106, hip: 130 },
];

export interface SizeMatch {
  row: SizeRow;
  /** Best match by each dimension — differing sizes are common and normal. */
  byBust: SizeRow | null;
  byWaist: SizeRow | null;
  byHip: SizeRow | null;
  /** True when bust/waist/hip fall in different sizes (grade the pattern). */
  mixed: boolean;
}

function nearest(rows: SizeRow[], key: "bust" | "waist" | "hip", cm: number | null): SizeRow | null {
  if (cm == null) return null;
  return rows.reduce((best, r) => (Math.abs(r[key] - cm) < Math.abs(best[key] - cm) ? r : best), rows[0]);
}

export function matchSize(bust: number | null, waist: number | null, hip: number | null): SizeMatch | null {
  const byBust = nearest(SIZE_CHART, "bust", bust);
  const byWaist = nearest(SIZE_CHART, "waist", waist);
  const byHip = nearest(SIZE_CHART, "hip", hip);
  const found = [byBust, byWaist, byHip].filter(Boolean) as SizeRow[];
  if (found.length === 0) return null;
  // Primary size follows bust for tops/dresses (industry convention),
  // falling back to whatever was measured.
  const row = byBust ?? byHip ?? byWaist!;
  const eus = new Set(found.map((r) => r.eu));
  return { row, byBust, byWaist, byHip, mixed: eus.size > 1 };
}

/** Difference between two sets in cm for a field (latest − previous). */
export function delta(latest: number | null, previous: number | null): number | null {
  if (latest == null || previous == null) return null;
  return Math.round((latest - previous) * 10) / 10;
}
