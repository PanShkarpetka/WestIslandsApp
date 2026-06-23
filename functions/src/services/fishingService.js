import { rollDie, rollDice } from '../utils/dice.js';

function applyGuidance({ useGuidance, config, modifiedRolls, rng }) {
  if (!useGuidance || !config.guidance?.enabled) {
    return {
      guidanceRolls: [],
      adjustedRolls: [...modifiedRolls],
      totalGuidanceBonus: 0,
      appliedTo: null
    };
  }

  const diceSides = config.guidance.diceSides || 4;
  const guidanceRolls = modifiedRolls.map(() => rollDie(diceSides, rng));
  const adjustedRolls = modifiedRolls.map((roll, idx) => roll + guidanceRolls[idx]);

  return {
    guidanceRolls,
    adjustedRolls,
    totalGuidanceBonus: guidanceRolls.reduce((sum, value) => sum + value, 0),
    appliedTo: 'all_rolls'
  };
}

function applyBaitBonus({ baitType, config, rng }) {
  const baitConfig = config.bait?.[baitType];
  if (!baitConfig?.enabled || !baitConfig.bonusDieSides) {
    return null;
  }

  return rollDie(baitConfig.bonusDieSides, rng);
}

function applyShipBonus({ useShip, rng }) {
  if (!useShip) {
    return null;
  }

  return rollDie(4, rng);
}

function rollWeatherSumModifier(sumModifier, rng) {
  if (!sumModifier || typeof sumModifier !== 'object') return 0;
  if (sumModifier.type === 'fixed') return Number(sumModifier.value || 0);

  const match = String(sumModifier.notation || '').trim().match(/^([+-]?)(\d*)d(\d+)$/i);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  const count = Math.max(1, Number(match[2] || 1));
  const sides = Math.max(1, Number(match[3] || 1));
  return sign * rollDice({ count, sides, rng }).reduce((sum, value) => sum + value, 0);
}

function normalizeWeatherEffects(weather) {
  const effects = weather?.effects || {};
  return {
    dcModifier: Number(effects.dcModifier ?? 0),
    sumModifier: effects.sumModifier || { type: 'fixed', value: 0, label: '' },
    fishValueMultiplier: Number(effects.fishValueMultiplier ?? 1),
    treasureChanceMultiplier: Number(effects.treasureChanceMultiplier ?? 1)
  };
}

function getRollCap({ baitType, useShip, hasCriticalSuccess = false }) {
  if (useShip) {
    return Number.POSITIVE_INFINITY;
  }

  const effectiveBaitType = hasCriticalSuccess && baitType === 'basic'
    ? 'advanced'
    : baitType;

  if (effectiveBaitType === 'basic') {
    return 53;
  }

  return 65;
}

function getFishCodeRange(fish) {
  const code = fish?.fishCodeNumber;

  if (typeof code === 'number') {
    return { min: Number(code), max: Number(code) };
  }

  return {
    min: Number(code?.min ?? Number.NaN),
    max: Number(code?.max ?? Number.NaN)
  };
}

function findFishByRoll(fishes, roll) {
  return fishes.find((fish) => {
    const range = getFishCodeRange(fish);
    return Number.isFinite(range.min) && Number.isFinite(range.max) && range.min <= roll && roll <= range.max;
  }) || null;
}

function findCatchableFish({ fishes, roll }) {
  let currentRoll = roll;

  while (currentRoll >= 1) {
    const matchedFish = findFishByRoll(fishes, currentRoll);
    if (!matchedFish) {
      currentRoll -= 1;
      continue;
    }

    if (Number(matchedFish.fishAmountAvailableNow || 0) > 0) {
      return { fish: matchedFish, effectiveRoll: currentRoll, originalMatchedFish: matchedFish };
    }

    const range = getFishCodeRange(matchedFish);
    currentRoll = Number.isFinite(range.min) ? range.min - 1 : currentRoll - 1;
  }

  return { fish: null, effectiveRoll: null, originalMatchedFish: null };
}

export function resolveFishingAttempt({ normalizedInput, config, fishes, rng = Math.random, weather = null }) {
  const rawRolls = rollDice({ count: 3, sides: 20, rng });
  const modifiedRolls = rawRolls.map((roll, idx) => roll + normalizedInput.modifiers[idx]);
  const weatherEffects = normalizeWeatherEffects(weather);

  const guidance = applyGuidance({
    useGuidance: normalizedInput.useGuidance,
    config,
    modifiedRolls,
    rng
  });

  const baitBonusRoll = applyBaitBonus({ baitType: normalizedInput.baitType, config, rng });
  const shipBonusRoll = applyShipBonus({ useShip: normalizedInput.useShip, rng });
  const weatherSumModifier = rollWeatherSumModifier(weatherEffects.sumModifier, rng);
  const finalRolls = guidance.adjustedRolls;

  const baseEachRollDc = Number(config.dc?.eachRollDc || 10);
  const eachRollDc = Math.max(1, baseEachRollDc + weatherEffects.dcModifier);
  const failedRollIndexes = finalRolls
    .map((value, idx) => (value >= eachRollDc ? null : idx))
    .filter((idx) => idx !== null);
  const passedEachRollDc = failedRollIndexes.length === 0;

  const computedSum = finalRolls.reduce((sum, value) => sum + value, 0)
    + (baitBonusRoll || 0)
    + (shipBonusRoll || 0)
    + weatherSumModifier;

  const hasCriticalSuccess = rawRolls.some((roll) => roll === 20);
  const cap = getRollCap({
    baitType: normalizedInput.baitType,
    useShip: normalizedInput.useShip,
    hasCriticalSuccess
  });
  const cappedSum = Math.min(computedSum, cap);

  const sortedFishes = [...fishes].sort((a, b) => getFishCodeRange(a).min - getFishCodeRange(b).min);
  const catchData = passedEachRollDc
    ? findCatchableFish({ fishes: sortedFishes, roll: cappedSum })
    : { fish: null, effectiveRoll: null };

  return {
    normalizedInput,
    rawRolls,
    modifiedRolls,
    finalRolls,
    guidance,
    baitBonusRoll,
    shipBonusRoll,
    weather,
    weatherEffects,
    baseEachRollDc,
    effectiveEachRollDc: eachRollDc,
    weatherSumModifier,
    eachRollDc,
    failedRollIndexes,
    passedEachRollDc,
    computedSum,
    hasCriticalSuccess,
    finalSum: cappedSum,
    selectedFish: catchData.fish,
    rolledFish: passedEachRollDc ? findFishByRoll(sortedFishes, cappedSum) : null,
    effectiveRollUsed: catchData.effectiveRoll,
    success: Boolean(catchData.fish)
  };
}

export function resolveFishByCode(fishes, code) {
  const sortedFishes = [...fishes].sort((a, b) => getFishCodeRange(a).min - getFishCodeRange(b).min);
  const requestedFish = findFishByRoll(sortedFishes, code);
  const catchData = findCatchableFish({ fishes: sortedFishes, roll: code });

  return {
    requestedFish,
    resolvedFish: catchData.fish,
    effectiveRoll: catchData.effectiveRoll,
    isFallback: Boolean(requestedFish && catchData.fish && requestedFish !== catchData.fish),
    isUnavailable: Boolean(requestedFish && !catchData.fish)
  };
}

function normalizeTreasureConfig(config = {}) {
  if (config.enabled === false) return [];
  const table = Array.isArray(config.table) ? config.table : [];
  return table
    .map((entry) => {
      const min = Math.max(0, Math.round(Number(entry?.valueGold?.min ?? 0)));
      const max = Math.max(min, Math.round(Number(entry?.valueGold?.max ?? min)));
      const chance = Number(entry?.chance ?? 0);
      return {
        id: String(entry?.id || '').trim(),
        name: String(entry?.name || entry?.id || '').trim(),
        chance,
        valueGold: { min, max }
      };
    })
    .filter((entry) => entry.id && entry.name && entry.chance > 0)
    .sort((a, b) => a.chance - b.chance);
}

function rollIntInclusive(min, max, rng = Math.random) {
  const low = Math.min(Number(min), Number(max));
  const high = Math.max(Number(min), Number(max));
  return Math.floor(rng() * (high - low + 1)) + low;
}

export function rollFishingTreasure({ config = {}, rng = Math.random, chanceMultiplier = 1 } = {}) {
  const table = normalizeTreasureConfig(config);
  if (!table.length) return null;
  const multiplier = Math.max(0, Number(chanceMultiplier ?? 1));

  let treasure = null;
  let roll = null;
  for (const entry of table) {
    roll = rng();
    if (roll < Math.min(1, entry.chance * multiplier)) {
      treasure = entry;
      break;
    }
  }
  if (!treasure) return null;

  const valueGold = rollIntInclusive(treasure.valueGold.min, treasure.valueGold.max, rng);
  return {
    treasureId: treasure.id,
    treasureName: treasure.name,
    valueGold,
    valueRangeGold: { ...treasure.valueGold },
    chance: treasure.chance,
    roll
  };
}

export const __testables = {
  applyBaitBonus,
  applyGuidance,
  applyShipBonus,
  getRollCap,
  getFishCodeRange,
  findFishByRoll,
  findCatchableFish,
  normalizeTreasureConfig,
  rollIntInclusive
};
