import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFishingAttempt } from '../src/services/fishingService.js';

function makeRng(values) {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

const baseConfig = {
  dc: { mainCatch: 30, additionalCheckDc: 10 },
  quantityRules: [{ minSum: 40, quantity: 2 }, { minSum: 30, quantity: 1 }],
  guidance: { enabled: true, diceSides: 4, applyTo: 'lowest_roll' },
  bait: {
    basic: { enabled: true, bonusDieSides: 0 },
    simple: { enabled: true, bonusDieSides: 4 },
    advanced: { enabled: true, bonusDieSides: 6 }
  },
  fishSelection: { allowDuplicates: false }
};

test('applies modifiers and bait bonus and catches fish', () => {
  const fishes = [
    { id: 'f1', fishName: 'Minnow', fishAmountAvailableNow: 5, fishAdditionalRollsRequiredForSuccessfulCatch: 0 }
  ];
  const rng = makeRng([0.2, 0.2, 0.2, 0.1, 0]);
  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [1, 1, 1], useGuidance: false, baitType: 'simple' },
    config: baseConfig,
    fishes,
    rng
  });

  assert.deepEqual(result.rawRolls, [5, 5, 5]);
  assert.deepEqual(result.modifiedRolls, [6, 6, 6]);
  assert.equal(result.baitBonusRoll, 1);
  assert.equal(result.finalSum, 19);
  assert.equal(result.success, false);
});

test('guidance on lowest roll and additional check pass', () => {
  const fishes = [
    { id: 'f1', fishName: 'Trout', fishAmountAvailableNow: 2, fishAdditionalRollsRequiredForSuccessfulCatch: 1 }
  ];
  const rng = makeRng([0.9, 0.1, 0.9, 0.5, 0, 0.8]);
  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [0, 0, 0], useGuidance: true, baitType: 'basic' },
    config: baseConfig,
    fishes,
    rng
  });

  assert.equal(result.guidance.guidanceRoll, 3);
  assert.equal(result.dcChecks[0].passed, true);
  assert.equal(result.candidateCatches.length, 1);
  assert.equal(result.additionalCheckResults[0].passed, true);
});

test('additional checks can block catches', () => {
  const fishes = [
    { id: 'f1', fishName: 'Eel', fishAmountAvailableNow: 2, fishAdditionalRollsRequiredForSuccessfulCatch: 2 }
  ];
  const rng = makeRng([0.95, 0.95, 0.95, 0, 0.01]);
  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [0, 0, 0], useGuidance: false, baitType: 'basic' },
    config: baseConfig,
    fishes,
    rng
  });

  assert.equal(result.dcChecks[0].passed, true);
  assert.equal(result.candidateCatches.length, 0);
  assert.equal(result.additionalCheckResults[0].passed, false);
});
