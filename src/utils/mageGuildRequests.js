function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeSpellLevel(value) {
  if (value === null || value === undefined) return ''

  const normalized = String(value).trim()
  if (!normalized) return ''

  const lowerCased = normalized.toLowerCase()
  if (['0', '0lvl', '0 lvl', 'level 0', 'lvl 0', 'cantrip', 'cantrips'].includes(lowerCased)) {
    return '0'
  }

  return normalized
}

export function normalizeSpellTier(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim().toUpperCase()
}

export function getSpellLevel(spell) {
  return normalizeSpellLevel(spell?.spellLevel ?? spell?.level ?? spell?.lvl ?? spell?.spellLvl)
}

export function getSpellTier(spell) {
  return normalizeSpellTier(spell?.spellTier ?? spell?.tier ?? spell?.rank)
}

export function getSpellName(spell) {
  return spell?.name || spell?.spellName || spell?.title || spell?.id || 'Невідоме закляття'
}

export function getSpellPrice(spell, fallback = 0) {
  return toFiniteNumber(
    spell?.currentPrice
      ?? spell?.raw?.currentPrice
      ?? spell?.price
      ?? spell?.raw?.price
      ?? spell?.compensation
      ?? spell?.raw?.compensation
      ?? spell?.cost
      ?? spell?.raw?.cost
      ?? spell?.servicePrice
      ?? spell?.raw?.servicePrice,
    fallback,
  )
}

export function getSpellMaterialComponentPrice(spell, fallback = 0) {
  return toFiniteNumber(
    spell?.consumablePrice
      ?? spell?.raw?.consumablePrice,
    fallback,
  )
}

export function getSpellCompensation(spell, fallback = 0) {
  return getSpellPrice(spell, fallback) + getSpellMaterialComponentPrice(spell, 0)
}

export function clampSpellPrice(value, priceConfig = {}) {
  const min = toFiniteNumber(priceConfig?.min, 0)
  const max = Number.isFinite(Number(priceConfig?.max)) ? Number(priceConfig.max) : Number.POSITIVE_INFINITY
  const normalized = Math.round(toFiniteNumber(value, priceConfig?.default ?? 0) * 100) / 100

  return Math.min(Math.max(normalized, min), max)
}

export function applySpellPriceDelta(currentPrice, priceConfig = {}, direction = 'increase') {
  const basePrice = toFiniteNumber(currentPrice, priceConfig?.default ?? 0)
  const delta = Math.max(0, toFiniteNumber(priceConfig?.delta, 0))
  const factor = direction === 'decrease' ? 1 - delta : 1 + delta

  return clampSpellPrice(basePrice * factor, priceConfig)
}

export function rollInteger(min, max, rng = Math.random) {
  const normalizedMin = Math.ceil(toFiniteNumber(min, 0))
  const normalizedMax = Math.floor(toFiniteNumber(max, normalizedMin))

  if (normalizedMax <= normalizedMin) return normalizedMin

  const safeRng = typeof rng === 'function' ? rng : Math.random
  return Math.floor(safeRng() * (normalizedMax - normalizedMin + 1)) + normalizedMin
}

export function pickWeightedKey(weightMap, rng = Math.random) {
  const entries = Object.entries(weightMap || {})
    .map(([key, rawChance]) => ({ key, chance: toFiniteNumber(rawChance, 0) }))
    .filter((entry) => entry.chance > 0)

  if (!entries.length) return ''

  const totalChance = entries.reduce((sum, entry) => sum + entry.chance, 0)
  if (totalChance <= 0) return entries[0].key

  let threshold = (typeof rng === 'function' ? rng : Math.random)() * totalChance

  for (const entry of entries) {
    threshold -= entry.chance
    if (threshold <= 0) {
      return entry.key
    }
  }

  return entries[entries.length - 1].key
}

function buildEligiblePools(normalizedSpells, spellTypes) {
  const pools = []

  for (const [spellLevel, levelConfig] of Object.entries(spellTypes || {})) {
    const tierEntries = Object.entries(levelConfig || {})
      .filter(([key, value]) => key !== 'chance' && key !== 'price' && value && typeof value === 'object')

    for (const [spellTier, tierConfig] of tierEntries) {
      const pool = normalizedSpells.filter(
        (spell) => spell.normalizedLevel === normalizeSpellLevel(spellLevel)
          && spell.normalizedTier === normalizeSpellTier(spellTier),
      )

      if (!pool.length) continue

      pools.push({
        spellLevel,
        spellTier,
        levelConfig,
        tierConfig,
        pool,
      })
    }
  }

  return pools
}

function buildRequestFromPool(entry, requestIndex, rng) {
  const spell = entry.pool[rollInteger(0, entry.pool.length - 1, rng)]
  const compensationFallback = entry.tierConfig?.price ?? entry.levelConfig?.price?.default ?? 0

  return {
    localId: `request-${requestIndex + 1}-${Math.round((typeof rng === 'function' ? rng : Math.random)() * 1e9)}`,
    spellId: spell.id,
    spellName: spell.normalizedName,
    spellLevel: normalizeSpellLevel(entry.spellLevel),
    spellTier: normalizeSpellTier(entry.spellTier),
    downtimeDays: rollInteger(entry.tierConfig?.downtimeMin ?? 1, entry.tierConfig?.downtimeMax ?? 1, rng),
    compensation: getSpellCompensation(spell, compensationFallback),
    fulfilled: false,
    fulfilledAt: null,
    fulfilledByHeroId: '',
    fulfilledByHeroName: '',
    telegramPostUrl: '',
    spellRefPath: spell.refPath || (spell.id ? `spells/${spell.id}` : ''),
  }
}

export function buildSpellRequestDrafts({ population = 0, spellTypes = {}, spells = [], rng = Math.random }) {
  const requestsMin = Math.max(0, Math.ceil(toFiniteNumber(population, 0) / 100))
  const requestsMax = requestsMin * 3
  const requestsCount = requestsMin > 0 ? rollInteger(requestsMin, requestsMax, rng) : 0

  const normalizedSpells = spells.map((spell) => ({
    ...spell,
    normalizedLevel: getSpellLevel(spell),
    normalizedTier: getSpellTier(spell),
    normalizedName: getSpellName(spell),
  }))

  const eligiblePools = buildEligiblePools(normalizedSpells, spellTypes)
  const requests = []

  if (!eligiblePools.length || requestsCount === 0) {
    return {
      requestsMin,
      requestsMax,
      requestsCount,
      requests,
    }
  }

  const levelChances = Object.fromEntries(
    Object.entries(spellTypes || {}).map(([level, config]) => [level, config?.chance ?? 0]),
  )

  const maxAttempts = Math.max(requestsCount * 25, requestsMin * 50, 100)
  let attempts = 0

  while (requests.length < requestsCount && attempts < maxAttempts) {
    attempts += 1

    const spellLevel = pickWeightedKey(levelChances, rng)
    if (!spellLevel) continue

    const levelConfig = spellTypes?.[spellLevel] || {}
    const tierChances = Object.fromEntries(
      Object.entries(levelConfig)
        .filter(([key, value]) => key !== 'chance' && key !== 'price' && value && typeof value === 'object')
        .map(([tier, tierConfig]) => [tier, tierConfig?.chance ?? 0]),
    )

    const spellTier = pickWeightedKey(tierChances, rng)
    if (!spellTier) continue

    const poolEntry = eligiblePools.find((entry) =>
      entry.spellLevel === spellLevel && normalizeSpellTier(entry.spellTier) === normalizeSpellTier(spellTier),
    )

    if (!poolEntry) continue

    requests.push(buildRequestFromPool(poolEntry, requests.length, rng))
  }

  let fallbackIndex = 0
  while (requests.length < requestsMin && eligiblePools.length) {
    const poolEntry = eligiblePools[fallbackIndex % eligiblePools.length]
    requests.push(buildRequestFromPool(poolEntry, requests.length, rng))
    fallbackIndex += 1
  }

  while (requests.length < requestsCount && eligiblePools.length) {
    const poolEntry = eligiblePools[rollInteger(0, eligiblePools.length - 1, rng)]
    requests.push(buildRequestFromPool(poolEntry, requests.length, rng))
  }

  return {
    requestsMin,
    requestsMax,
    requestsCount,
    requests,
  }
}
