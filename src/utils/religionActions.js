export function calculateDefenseShieldBonus(result, dc) {
  const normalizedResult = Number(result)
  const normalizedDc = Number(dc)

  if (!Number.isFinite(normalizedResult) || !Number.isFinite(normalizedDc)) return 0
  if (normalizedResult < normalizedDc) return 0

  return 1 + Math.max(0, Math.floor((normalizedResult - normalizedDc) / 4))
}

export function calculateSpreadReligionOutcome({ result, baseDC, shieldBonus = 0 }) {
  const normalizedResult = Number(result)
  const normalizedBaseDC = Number(baseDC)
  const normalizedShieldBonus = Math.max(0, Number(shieldBonus) || 0)

  if (!Number.isFinite(normalizedResult) || !Number.isFinite(normalizedBaseDC)) {
    return {
      dc: normalizedBaseDC + normalizedShieldBonus,
      convertedFollowers: 0,
      shieldDamage: 0,
      shieldRemaining: normalizedShieldBonus,
      shieldBroken: false,
    }
  }

  const dc = normalizedBaseDC + normalizedShieldBonus
  const attackSucceeded = normalizedResult >= dc
  const shieldBlocked = normalizedShieldBonus > 0 && normalizedResult >= normalizedBaseDC && normalizedResult < dc
  const shieldDamage = shieldBlocked
    ? Math.max(0, normalizedResult - normalizedBaseDC + 1)
    : 0
  const shieldRemaining = Math.max(0, normalizedShieldBonus - shieldDamage)

  return {
    dc,
    convertedFollowers: attackSucceeded ? 5 + Math.max(0, normalizedResult - dc) : 0,
    shieldDamage,
    shieldRemaining,
    shieldBroken: normalizedShieldBonus > 0 && (attackSucceeded || shieldRemaining <= 0),
  }
}
