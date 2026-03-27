/**
 * Weight overage calculation for dumpster rentals.
 *
 * Each dumpster size has an included weight allowance.
 * Anything over is charged at $150/ton.
 */

// Included weight in pounds per dumpster size
export const INCLUDED_WEIGHT_LBS: Record<string, number> = {
  "10yd": 4000,  // 2 tons
  "20yd": 8000,  // 4 tons
  "30yd": 10000, // 5 tons
};

export const OVERAGE_RATE_PER_TON = 150; // dollars

/**
 * Calculate weight overage charge.
 * @param dumpWeightLbs - actual weight from dump scale ticket
 * @param dumpsterSize - "10yd", "20yd", or "30yd"
 * @returns { overageLbs, overageCharge, isOver }
 */
export function calculateWeightOverage(
  dumpWeightLbs: number,
  dumpsterSize: string
): {
  includedLbs: number;
  overageLbs: number;
  overageTons: number;
  overageCharge: number;
  isOver: boolean;
} {
  const includedLbs = INCLUDED_WEIGHT_LBS[dumpsterSize] || 8000;
  const overageLbs = Math.max(0, dumpWeightLbs - includedLbs);
  const overageTons = overageLbs / 2000;
  const overageCharge = Math.round(overageTons * OVERAGE_RATE_PER_TON * 100) / 100;

  return {
    includedLbs,
    overageLbs,
    overageTons: Math.round(overageTons * 100) / 100,
    overageCharge,
    isOver: overageLbs > 0,
  };
}
