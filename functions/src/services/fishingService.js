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

  return 67;
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

export function resolveFishingAttempt({ normalizedInput, config, fishes, rng = Math.random }) {
  const rawRolls = rollDice({ count: 3, sides: 20, rng });
  const modifiedRolls = rawRolls.map((roll, idx) => roll + normalizedInput.modifiers[idx]);

  const guidance = applyGuidance({
    useGuidance: normalizedInput.useGuidance,
    config,
    modifiedRolls,
    rng
  });

  const baitBonusRoll = applyBaitBonus({ baitType: normalizedInput.baitType, config, rng });
  const shipBonusRoll = applyShipBonus({ useShip: normalizedInput.useShip, rng });
  const finalRolls = guidance.adjustedRolls;

  const eachRollDc = Number(config.dc?.eachRollDc || 10);
  const failedRollIndexes = finalRolls
    .map((value, idx) => (value >= eachRollDc ? null : idx))
    .filter((idx) => idx !== null);
  const passedEachRollDc = failedRollIndexes.length === 0;

  const computedSum = finalRolls.reduce((sum, value) => sum + value, 0)
    + (baitBonusRoll || 0)
    + (shipBonusRoll || 0);

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

export const __testables = {
  applyBaitBonus,
  applyGuidance,
  applyShipBonus,
  getRollCap,
  getFishCodeRange,
  findFishByRoll,
  findCatchableFish
};
