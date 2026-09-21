export const GARMENT_TYPES = [
  { value: 'Bridal Gown', base: 4500 },
  { value: 'Evening Dress', base: 1800 },
  { value: 'Traditional Set (Kente/Ntoma)', base: 1500 },
  { value: 'Wedding Guest Outfit', base: 1200 },
  { value: "Men's Agbada / Suit", base: 2200 },
  { value: 'Two-Piece / Jumpsuit', base: 1000 },
  { value: 'Ready-to-Wear Piece', base: 600 },
  { value: 'Accessories (Headpiece/Sash)', base: 300 },
];

export const COMPLEXITY_OPTIONS = [
  { value: 'Simple', factor: 0.85 },
  { value: 'Moderate', factor: 1 },
  { value: 'Elaborate', factor: 1.35 },
];

export const URGENCY_OPTIONS = [
  { value: 'Normal', factor: 1 },
  { value: 'Rush', factor: 1.25 },
];

export function quotePrice({ garmentType, complexity, urgency, fabricCost, overhead }) {
  const base = GARMENT_TYPES.find(g => g.value === garmentType)?.base || 1000;
  const complexityFactor = COMPLEXITY_OPTIONS.find(c => c.value === complexity)?.factor ?? 1;
  const urgencyFactor = URGENCY_OPTIONS.find(u => u.value === urgency)?.factor ?? 1;
  const fabric = Number(fabricCost) || 0;
  const oh = Number(overhead) || 0;
  const total = base * complexityFactor * urgencyFactor + fabric + oh;
  return Math.round(total / 50) * 50;
}