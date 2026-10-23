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

export type FieldGroup =
  | "Stature"
  | "Upper body"
  | "Shoulders & neck"
  | "Bust detail"
  | "Waist detail"
  | "Arm"
  | "Arms (left / right)"
  | "Lower body"
  | "Hips & legs (left / right)"
  | "Full-length garment";

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
  /**
   * Stored in the measurement_sets.extended jsonb column rather than a
   * dedicated column (still centimetres). Adding another extended field
   * only needs an entry here — no migration.
   */
  extended?: boolean;
}

export type MeasurementKey =
  | "height" | "weight"
  | "neck" | "shoulder" | "acrossBack" | "bust" | "bustPoint" | "shoulderToBust"
  | "underbust" | "waist" | "backLength" | "frontLength"
  | "sleeve" | "upperArm" | "wrist"
  | "hip" | "waistToHip" | "crotchDepth" | "thigh" | "knee" | "ankle"
  | "inseam" | "outseam" | "length"
  // Extended (Base44 parity) — Shoulders & neck
  | "frontNeckDepth" | "backNeckDepth" | "shoulderWidth"
  | "leftShoulderLength" | "rightShoulderLength"
  | "leftShoulderHeight" | "rightShoulderHeight" | "acrossChest"
  // Bust detail
  | "highBust" | "upperBust" | "bustPointToWaist" | "leftBust" | "rightBust"
  // Waist detail
  | "highWaist" | "lowerWaist"
  // Arms (left / right)
  | "armhole" | "leftUpperArm" | "rightUpperArm" | "leftWrist" | "rightWrist" | "shoulderToWrist"
  // Hips & legs (left / right)
  | "highHip" | "leftThigh" | "rightThigh" | "leftKnee" | "rightKnee"
  | "leftCalf" | "rightCalf" | "leftAnkle" | "rightAnkle" | "frontRise" | "backRise"
  // Full-length garment
  | "shoulderToFloor" | "bustToFloor" | "dressLength" | "skirtLength" | "topLength" | "trouserLength";

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

  // ═══ Extended fields (Base44 parity) ═══════════════════════════════════
  { key: "frontNeckDepth", label: "Front neck depth", group: "Shoulders & neck", extended: true, range: [4, 22],
    how: "From the neck-base line straight down the centre front to where the finished neckline should sit." },
  { key: "backNeckDepth", label: "Back neck depth", group: "Shoulders & neck", extended: true, range: [1, 14],
    how: "From the neck-base line down the centre back to where the finished back neckline should sit." },
  { key: "shoulderWidth", label: "Shoulder width (front, point to point)", group: "Shoulders & neck", extended: true, range: [30, 60],
    how: "Straight line across the front between the two shoulder points (acromion). Differs from 'Across shoulder', which is taken across the back." },
  { key: "leftShoulderLength", label: "Left shoulder length", group: "Shoulders & neck", extended: true, range: [9, 20],
    how: "From the side of the neck to the left shoulder point, along the top of the shoulder." },
  { key: "rightShoulderLength", label: "Right shoulder length", group: "Shoulders & neck", extended: true, range: [9, 20],
    how: "From the side of the neck to the right shoulder point, along the top of the shoulder." },
  { key: "leftShoulderHeight", label: "Left shoulder height (from floor)", group: "Shoulders & neck", extended: true, range: [100, 175],
    how: "Floor to the left shoulder point, standing straight. Compare with the right to spot uneven shoulders." },
  { key: "rightShoulderHeight", label: "Right shoulder height (from floor)", group: "Shoulders & neck", extended: true, range: [100, 175],
    how: "Floor to the right shoulder point, standing straight. Compare with the left to spot uneven shoulders." },
  { key: "acrossChest", label: "Across chest", group: "Shoulders & neck", extended: true, range: [26, 52],
    how: "Across the front between the two front armfold creases, at armpit level." },
  { key: "highBust", label: "High bust girth", group: "Bust detail", extended: true, range: [60, 160],
    how: "Horizontal tape around the chest high up, directly under the armpits, level at the back." },
  { key: "upperBust", label: "Upper bust girth", group: "Bust detail", extended: true, range: [60, 160],
    how: "Horizontal tape around the upper chest, about 5 cm above the fullest part of the bust." },
  { key: "bustPointToWaist", label: "Bust point to waist", group: "Bust detail", extended: true, range: [15, 40],
    how: "From the bust point straight down to the natural waist." },
  { key: "leftBust", label: "Left bust (single side)", group: "Bust detail", extended: true, range: [25, 90],
    how: "Left side only, centre front to side seam across the fullest part. Record both sides when they differ noticeably." },
  { key: "rightBust", label: "Right bust (single side)", group: "Bust detail", extended: true, range: [25, 90],
    how: "Right side only, centre front to side seam across the fullest part. Record both sides when they differ noticeably." },
  { key: "highWaist", label: "High waist girth", group: "Waist detail", extended: true, range: [45, 170],
    how: "Horizontal tape just below the ribcage, above the natural waist." },
  { key: "lowerWaist", label: "Lower waist girth", group: "Waist detail", extended: true, range: [50, 180],
    how: "Horizontal tape about 5 cm below the natural waist — for low-rise garments." },
  { key: "armhole", label: "Armhole girth", group: "Arms (left / right)", extended: true, range: [34, 62],
    how: "Around the armscye: from the shoulder point, under the armpit, and back up to the shoulder point." },
  { key: "leftUpperArm", label: "Left upper arm girth", group: "Arms (left / right)", extended: true, range: [18, 50],
    how: "Around the fullest part of the left upper arm, arm hanging relaxed." },
  { key: "rightUpperArm", label: "Right upper arm girth", group: "Arms (left / right)", extended: true, range: [18, 50],
    how: "Around the fullest part of the right upper arm, arm hanging relaxed." },
  { key: "leftWrist", label: "Left wrist girth", group: "Arms (left / right)", extended: true, range: [12, 22],
    how: "Around the left wrist just above the wrist bone." },
  { key: "rightWrist", label: "Right wrist girth", group: "Arms (left / right)", extended: true, range: [12, 22],
    how: "Around the right wrist just above the wrist bone." },
  { key: "shoulderToWrist", label: "Shoulder to wrist (arm straight)", group: "Arms (left / right)", extended: true, range: [45, 80],
    how: "From the shoulder point to the wrist bone with the arm hanging straight. 'Arm length' above is taken over a slightly bent elbow." },
  { key: "highHip", label: "High hip girth", group: "Hips & legs (left / right)", extended: true, range: [65, 170],
    how: "Horizontal tape around the top of the hip bones, about 10 cm below the waist." },
  { key: "leftThigh", label: "Left thigh girth", group: "Hips & legs (left / right)", extended: true, range: [35, 80],
    how: "Around the fullest part of the left upper thigh, just below the buttock fold." },
  { key: "rightThigh", label: "Right thigh girth", group: "Hips & legs (left / right)", extended: true, range: [35, 80],
    how: "Around the fullest part of the right upper thigh, just below the buttock fold." },
  { key: "leftKnee", label: "Left knee girth", group: "Hips & legs (left / right)", extended: true, range: [26, 55],
    how: "Around the left knee over the middle of the kneecap, leg straight." },
  { key: "rightKnee", label: "Right knee girth", group: "Hips & legs (left / right)", extended: true, range: [26, 55],
    how: "Around the right knee over the middle of the kneecap, leg straight." },
  { key: "leftCalf", label: "Left calf girth", group: "Hips & legs (left / right)", extended: true, range: [24, 55],
    how: "Around the fullest part of the left calf." },
  { key: "rightCalf", label: "Right calf girth", group: "Hips & legs (left / right)", extended: true, range: [24, 55],
    how: "Around the fullest part of the right calf." },
  { key: "leftAnkle", label: "Left ankle girth", group: "Hips & legs (left / right)", extended: true, range: [18, 34],
    how: "Around the narrowest part of the left ankle." },
  { key: "rightAnkle", label: "Right ankle girth", group: "Hips & legs (left / right)", extended: true, range: [18, 34],
    how: "Around the narrowest part of the right ankle." },
  { key: "frontRise", label: "Front rise", group: "Hips & legs (left / right)", extended: true, range: [20, 40],
    how: "From the crotch point up the centre front to the waistline." },
  { key: "backRise", label: "Back rise", group: "Hips & legs (left / right)", extended: true, range: [25, 52],
    how: "From the crotch point up the centre back to the waistline." },
  { key: "shoulderToFloor", label: "Shoulder to floor", group: "Full-length garment", extended: true, range: [110, 190],
    how: "From the shoulder-neck point straight down the front to the floor, in the shoes the garment will be worn with." },
  { key: "bustToFloor", label: "Bust point to floor", group: "Full-length garment", extended: true, range: [90, 170],
    how: "From the bust point straight down to the floor, in the shoes the garment will be worn with." },
  { key: "dressLength", label: "Dress length (as requested)", group: "Full-length garment", extended: true, range: [50, 200],
    how: "Finished dress length from the shoulder-neck point, as the client wants it." },
  { key: "skirtLength", label: "Skirt length (as requested)", group: "Full-length garment", extended: true, range: [30, 150],
    how: "Finished skirt length from the natural waist, as the client wants it." },
  { key: "topLength", label: "Top length (as requested)", group: "Full-length garment", extended: true, range: [30, 110],
    how: "Finished top length from the shoulder-neck point, as the client wants it." },
  { key: "trouserLength", label: "Trouser length (as requested)", group: "Full-length garment", extended: true, range: [60, 130],
    how: "Finished trouser length from the natural waist, as the client wants it." },
];

export const FIELD_GROUPS: FieldGroup[] = [
  "Stature",
  "Upper body",
  "Shoulders & neck",
  "Bust detail",
  "Waist detail",
  "Arm",
  "Arms (left / right)",
  "Lower body",
  "Hips & legs (left / right)",
  "Full-length garment",
];

/** Fields persisted in measurement_sets.extended (jsonb), all in cm. */
export const EXTENDED_FIELDS = MEASUREMENT_FIELDS.filter((f) => f.extended);

/** Shared by the entry form and the API so both accept exactly the same values. */
export const SHOULDER_SLOPES = ["Square", "Normal", "Sloping", "Uneven", "Custom"] as const;
export const GARMENT_TYPES = ["General", "Dress", "Top", "Skirt", "Trousers", "Bridal"] as const;
export const SET_STATUSES = ["Draft", "Confirmed"] as const;
export const APPROVAL_STATES = ["Pending", "Approved"] as const;

export const FIELD_BY_KEY = Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, f])) as Record<
  MeasurementKey,
  MeasurementField
>;

/**
 * Standard adult-average body dimensions (cm), one set per gender, used as
 * a dummy starting base for a customer with no measurement history yet —
 * distinct from "start from previous session", which uses this customer's
 * own last-recorded figures. Figures are representative averages for a
 * mid-range adult build (roughly UK 12–14 / EU 40 for women, UK/EU 40
 * chest for men) — always meant to be adjusted to the actual client, never
 * used as-is. `length` is garment-specific, not a body dimension, so it's
 * never prefilled. Bust-dart landmarks (bustPoint, shoulderToBust,
 * underbust) aren't conventionally taken for menswear, so they're omitted
 * from the male set rather than filled with a misleading guess.
 */
export const DUMMY_MEASUREMENTS: Record<"Female" | "Male", Partial<Record<MeasurementKey, number>>> = {
  Female: {
    height: 165, weight: 65,
    neck: 34, shoulder: 39, acrossBack: 35, bust: 92, bustPoint: 18,
    shoulderToBust: 26, underbust: 78, waist: 75, backLength: 40, frontLength: 41,
    sleeve: 58, upperArm: 28, wrist: 15,
    hip: 100, waistToHip: 20, crotchDepth: 28, thigh: 56, knee: 38, ankle: 22,
    inseam: 76, outseam: 102,
  },
  Male: {
    height: 175, weight: 78,
    neck: 39, shoulder: 45, acrossBack: 42, bust: 100,
    waist: 88, backLength: 44, frontLength: 45,
    sleeve: 63, upperArm: 32, wrist: 17,
    hip: 98, waistToHip: 21, crotchDepth: 27, thigh: 58, knee: 40, ankle: 24,
    inseam: 82, outseam: 106,
  },
};

/** Pick the dummy base for a customer's gender. Anything other than "Male" defaults to the Female set. */
export function dummyMeasurementsFor(gender: string | null | undefined) {
  return (gender || "").trim().toLowerCase() === "male" ? DUMMY_MEASUREMENTS.Male : DUMMY_MEASUREMENTS.Female;
}

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
