import { rollDie, rollDice } from '../utils/dice.js';

function evaluateQuantity(finalSum, quantityRules = []) {
  const sorted = [...quantityRules].sort((a, b) => b.minSum - a.minSum);
  for (const rule of sorted) {
    if (finalSum >= rule.minSum) {
      return rule.quantity;
    }
  }

  return 0;
}

function applyGuidance({ useGuidance, config, modifiedRolls, rng }) {
  if (!useGuidance || !config.guidance?.enabled) {
    return { guidanceRoll: null, adjustedRolls: [...modifiedRolls], appliedTo: null };
  }

  const guidanceRoll = rollDie(config.guidance.diceSides || 4, rng);
  const adjustedRolls = [...modifiedRolls];
  let appliedTo = config.guidance.applyTo || 'all_rolls';

  if (appliedTo === 'final_sum') {
    return { guidanceRoll, adjustedRolls, appliedTo };
  }

  adjustedRolls.forEach((adjustedRoll) => adjustedRoll += rollDie(config.guidance.diceSides || 4, rng))

  return { guidanceRoll, adjustedRolls, appliedTo };
}

function applyBaitBonus({ baitType, config, rng }) {
  const baitConfig = config.bait?.[baitType];
  if (!baitConfig?.enabled || !baitConfig.bonusDieSides) {
    return null;
  }

  return rollDie(baitConfig.bonusDieSides, rng);
}

function checkAdditionalRolls({ fish, config, rng }) {
  const required = Number(fish.fishAdditionalRollsRequiredForSuccessfulCatch || 0);
  if (required <= 0) {
    return { passed: true, rolls: [], dc: null };
  }

  const dc = Number(config.dc.additionalCheckDc || 10);
  const rolls = rollDice({ count: required, sides: 20, rng });
  const passed = rolls.every((roll) => roll >= dc);
  return { passed, rolls, dc };
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
  const rollsForSum = guidance.adjustedRolls;
  const guidanceSumBonus = guidance.appliedTo === 'final_sum' ? (guidance.guidanceRoll || 0) : 0;

  const finalSum = rollsForSum.reduce((sum, value) => sum + value, 0)
    + guidanceSumBonus
    + (baitBonusRoll || 0);

  const mainDc = Number(config.dc.mainCatch || 45);
  const isMainSuccess = finalSum >= mainDc;

  if (!isMainSuccess) {
    return {
      normalizedInput,
      rawRolls,
      modifiedRolls,
      finalRolls: rollsForSum,
      guidance,
      baitBonusRoll,
      finalSum,
      dcChecks: [{ type: 'main', dc: mainDc, passed: false }],
      quantityTarget: 0,
      candidateCatches: [],
      additionalCheckResults: [],
      success: false
    };
  }

  const quantityTarget = evaluateQuantity(finalSum, config.quantityRules);
  const available = fishes.filter((fish) => Number(fish.fishAmountAvailableNow || 0) > 0);
  const candidateCatches = [];
  const additionalCheckResults = [];

  while (candidateCatches.length < quantityTarget && available.length > 0) {
    const index = Math.floor(rng() * available.length);
    const fish = available[index];

    const check = checkAdditionalRolls({ fish, config, rng });
    additionalCheckResults.push({ fishId: fish.id, fishName: fish.fishName, ...check });

    if (check.passed) {
      candidateCatches.push(fish);
    }

    if (!config.fishSelection?.allowDuplicates) {
      available.splice(index, 1);
    }
  }

  return {
    normalizedInput,
    rawRolls,
    modifiedRolls,
    finalRolls: rollsForSum,
    guidance,
    baitBonusRoll,
    finalSum,
    dcChecks: [{ type: 'main', dc: mainDc, passed: true }],
    quantityTarget,
    candidateCatches,
    additionalCheckResults,
    success: candidateCatches.length > 0
  };
}

export const __testables = {
  applyBaitBonus,
  applyGuidance,
  checkAdditionalRolls,
  evaluateQuantity
};
