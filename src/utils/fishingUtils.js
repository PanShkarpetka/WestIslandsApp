/**
 * Resolves the silver value of a caught fish.
 *
 * fishValueSilver is stored as { high, low } and fishCodeNumber as { min, max }.
 * We interpolate between low and high based on where effectiveRollUsed falls
 * within the fish's code range: min roll → low price, max roll → high price.
 *
 * @param {object} fish - item from a fishSelected array (embedded in a FishingLogDoc)
 * @param {number|null} effectiveRollUsed - the effectiveRollUsed field from the parent log
 * @returns {number}
 */
export function resolveFishValue(fish, effectiveRollUsed) {
  const val = fish.fishValueSilver;

  // Plain number (legacy / future)
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'object') return 0;

  const low = Number(val.low ?? 0);
  const high = Number(val.high ?? 0);

  const code = fish.fishCodeNumber;
  if (effectiveRollUsed != null && code && typeof code === 'object') {
    const codeMin = Number(code.min);
    const codeMax = Number(code.max);
    const roll = Number(effectiveRollUsed);

    if (Number.isFinite(codeMin) && Number.isFinite(codeMax) && codeMax > codeMin) {
      // Linear interpolation: min roll → low price, max roll → high price
      const t = Math.max(0, Math.min(1, (roll - codeMin) / (codeMax - codeMin)));
      return low + t * (high - low);
    }
    // Single-code fish — return high (same as low in practice)
    return high;
  }

  // No roll info available — use midpoint as estimate
  return (low + high) / 2;
}
