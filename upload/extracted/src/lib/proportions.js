// Garment-fitting proportion helpers. These are pattern-making observations only —
// never medical, biological or definitive body classifications.

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export function computeProportionRatios(set) {
  if (!set) return null;
  const height = num(set.height);
  const shoulderToWaist = num(set.shoulder_to_natural_waist) || num(set.shoulder_to_waist);
  const waistToFloor = num(set.waist_to_floor);
  const naturalWaist = num(set.natural_waist);
  const fullBust = num(set.full_bust);
  const fullHip = num(set.full_hip);
  const shoulderWidth = num(set.shoulder_width);

  const upperBodyLength = shoulderToWaist;
  const lowerBodyLength = waistToFloor;
  const upperToLowerRatio = upperBodyLength && lowerBodyLength ? upperBodyLength / lowerBodyLength : null;
  const legToHeightRatio = waistToFloor && height ? waistToFloor / height : null;
  const torsoToHeightRatio = upperBodyLength && height ? upperBodyLength / height : null;
  const shoulderToWaistRatio = shoulderWidth && naturalWaist ? shoulderWidth / naturalWaist : null;
  const waistToHipRatio = naturalWaist && fullHip ? naturalWaist / fullHip : null;
  const bustToWaistRatio = fullBust && naturalWaist ? fullBust / naturalWaist : null;
  const hipToWaistRatio = fullHip && naturalWaist ? fullHip / naturalWaist : null;

  let torsoClassification = null;
  if (torsoToHeightRatio != null) {
    torsoClassification = torsoToHeightRatio > 0.30 ? 'Long Torso' : torsoToHeightRatio < 0.25 ? 'Short Torso' : 'Balanced Torso';
  }
  let legClassification = null;
  if (legToHeightRatio != null) {
    legClassification = legToHeightRatio > 0.53 ? 'Long Legs' : legToHeightRatio < 0.48 ? 'Short Legs' : 'Balanced Legs';
  }
  let overallClassification = null;
  if (torsoClassification && legClassification) {
    if (torsoClassification === 'Balanced Torso' && legClassification === 'Balanced Legs') overallClassification = 'Balanced';
    else if (torsoClassification !== 'Long Torso' && legClassification === 'Long Legs') overallClassification = 'Long-leg / Shorter Torso';
    else if (torsoClassification === 'Long Torso' && legClassification !== 'Long Legs') overallClassification = 'Short-leg / Longer Torso';
    else if (torsoClassification === 'Long Torso') overallClassification = 'Long Torso';
    else if (torsoClassification === 'Short Torso') overallClassification = 'Short Torso';
    else overallClassification = 'Custom';
  }

  return {
    upperBodyLength, lowerBodyLength, upperToLowerRatio, legToHeightRatio, torsoToHeightRatio,
    shoulderToWaistRatio, waistToHipRatio, bustToWaistRatio, hipToWaistRatio,
    torsoClassification, legClassification, overallClassification,
  };
}

// Left/right pairs to check for a meaningful difference worth flagging for the designer.
const ASYMMETRY_PAIRS = [
  ['left_shoulder_height', 'right_shoulder_height', 'Shoulder height'],
  ['left_shoulder_length', 'right_shoulder_length', 'Shoulder length'],
  ['left_bust', 'right_bust', 'Bust'],
  ['left_thigh', 'right_thigh', 'Thigh'],
  ['left_knee', 'right_knee', 'Knee'],
  ['left_calf', 'right_calf', 'Calf'],
  ['left_ankle', 'right_ankle', 'Ankle'],
  ['left_upper_arm', 'right_upper_arm', 'Upper arm'],
  ['left_elbow', 'right_elbow', 'Elbow'],
  ['left_wrist', 'right_wrist', 'Wrist'],
];

export function detectAsymmetry(set, threshold = 1) {
  if (!set) return [];
  const flags = [];
  ASYMMETRY_PAIRS.forEach(([lKey, rKey, label]) => {
    const l = num(set[lKey]);
    const r = num(set[rKey]);
    if (l != null && r != null && Math.abs(l - r) >= threshold) {
      flags.push({ label, left: l, right: r, diff: Math.round((l - r) * 100) / 100 });
    }
  });
  return flags;
}

// Compare two measurement sets on shared numeric fields, returning changed/increased/decreased language.
export function compareMeasurementSets(older, newer) {
  if (!older || !newer) return [];
  const keys = Object.keys(newer).filter(k => typeof newer[k] === 'number' || typeof older[k] === 'number');
  const changes = [];
  keys.forEach((k) => {
    const a = num(older[k]);
    const b = num(newer[k]);
    if (a == null || b == null) return;
    const diff = Math.round((b - a) * 100) / 100;
    if (diff !== 0) {
      changes.push({ key: k, from: a, to: b, diff, direction: diff > 0 ? 'increased' : 'decreased' });
    }
  });
  return changes;
}