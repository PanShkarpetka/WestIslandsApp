/**
 * Parses a dice notation string like "20d10" or a plain number.
 * Returns { count, sides } for dice notation, or null for a plain number.
 * @param {string|number} notation
 * @returns {{ count: number, sides: number }|null}
 */
export function parseDiceNotation(notation) {
  if (typeof notation === 'number') return null
  const s = String(notation).trim().toLowerCase()
  const match = s.match(/^(\d+)d(\d+)$/)
  if (!match) return null
  return { count: parseInt(match[1], 10), sides: parseInt(match[2], 10) }
}

/**
 * Rolls dice or returns the plain number.
 * Accepts "20d10" (rolls 20d10), "5" or 5 (returns 5).
 * @param {string|number} notation
 * @param {() => number} rng - Random number generator, defaults to Math.random
 * @returns {number}
 */
export function rollDice(notation, rng = Math.random) {
  const parsed = parseDiceNotation(notation)
  if (!parsed) {
    const n = Number(notation)
    return Number.isFinite(n) ? n : 0
  }
  let total = 0
  for (let i = 0; i < parsed.count; i++) {
    total += Math.floor(rng() * parsed.sides) + 1
  }
  return total
}

/**
 * Returns a human-readable label for a dice notation or plain number.
 * E.g. "20d10" → "20d10", 15 → "15"
 * @param {string|number} notation
 * @returns {string}
 */
export function formatDiceNotation(notation) {
  return String(notation ?? '').trim() || '0'
}
