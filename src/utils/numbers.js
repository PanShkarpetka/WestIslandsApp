/**
 * Round a numeric value to 2 decimal places.
 * Returns 0 for non-finite inputs.
 */
export function normalizeAmount(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
}
