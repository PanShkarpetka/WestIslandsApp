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
  dc: { eachRollDc: 10 },
  guidance: { enabled: true, diceSides: 4, applyTo: 'all_rolls' },
  bait: {
    basic: { enabled: true, bonusDieSides: 0 },
    simple: { enabled: true, bonusDieSides: 4 },
    advanced: { enabled: true, bonusDieSides: 6 }
  }
};

test('applies guidance to all d20 rolls and adds bait bonus', () => {
  const fishes = [
    { id: 'f1', fishName: 'Snapper', fishAmountAvailableNow: 1, fishCodeNumber: { min: 20, max: 40 } }
  ];

  const rng = makeRng([
    0.2, 0.2, 0.2,
    0.1, 0.2, 0.3,
    0.5
  ]);

  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [5, 5, 5], useGuidance: true, baitType: 'simple', useShip: false },
    config: baseConfig,
    fishes,
    rng
  });

  assert.deepEqual(result.rawRolls, [5, 5, 5]);
  assert.deepEqual(result.modifiedRolls, [10, 10, 10]);
  assert.deepEqual(result.guidance.guidanceRolls, [1, 1, 2]);
  assert.deepEqual(result.finalRolls, [11, 11, 12]);
  assert.equal(result.passedEachRollDc, true);
  assert.equal(result.baitBonusRoll, 3);
  assert.equal(result.finalSum, 37);
  assert.equal(result.selectedFish.fishName, 'Snapper');
});

test('fails fishing when any roll is below eachRollDc', () => {
  const fishes = [
    { id: 'f1', fishName: 'Snapper', fishAmountAvailableNow: 1, fishCodeNumber: { min: 1, max: 100 } }
  ];
  const rng = makeRng([0.2, 0.2, 0.2]);

  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [0, 0, 0], useGuidance: false, baitType: 'basic', useShip: false },
    config: baseConfig,
    fishes,
    rng
  });

  assert.equal(result.passedEachRollDc, false);
  assert.deepEqual(result.failedRollIndexes, [0, 1, 2]);
  assert.equal(result.selectedFish, null);
  assert.equal(result.success, false);
});

test('uses previous fish by code range when rolled fish is unavailable', () => {
  const fishes = [
    { id: 'f1', fishName: 'Trout', fishAmountAvailableNow: 1, fishCodeNumber: { min: 61, max: 65 } },
    { id: 'f2', fishName: 'Wizard Eel', fishAmountAvailableNow: 0, fishCodeNumber: { min: 68, max: 68 } }
  ];

  const rng = makeRng([0.95, 0.95, 0.95]);
  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [3, 3, 2], useGuidance: false, baitType: 'basic', useShip: true },
    config: baseConfig,
    fishes,
    rng
  });

  assert.equal(result.finalSum, 69);
  assert.equal(result.rolledFish, null);
  assert.equal(result.effectiveRollUsed, 65);
  assert.equal(result.selectedFish.fishName, 'Trout');
});

test('caps sum by bait availability when ship is not used', () => {
  const fishes = [
    { id: 'f1', fishName: 'CapFish', fishAmountAvailableNow: 1, fishCodeNumber: { min: 67, max: 65 } }
  ];
  const rng = makeRng([0.95, 0.95, 0.95, 0.95]);

  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [20, 20, 20], useGuidance: false, baitType: 'simple', useShip: false },
    config: baseConfig,
    fishes,
    rng
  });

  assert.equal(result.computedSum > 65, true);
  assert.equal(result.finalSum, 65);
  assert.equal(result.selectedFish.fishName, 'CapFish');
});


test('treats basic bait cap as advanced when any raw d20 roll is a crit', () => {
  const fishes = [
    { id: 'f1', fishName: 'HighCapFish', fishAmountAvailableNow: 1, fishCodeNumber: { min: 60, max: 65 } }
  ];

  const rng = makeRng([0.99, 0.2, 0.2]);
  const result = resolveFishingAttempt({
    normalizedInput: { modifiers: [20, 20, 20], useGuidance: false, baitType: 'basic', useShip: false },
    config: baseConfig,
    fishes,
    rng
  });

  assert.equal(result.hasCriticalSuccess, true);
  assert.equal(result.computedSum > 53, true);
  assert.equal(result.finalSum, 65);
  assert.equal(result.selectedFish.fishName, 'HighCapFish');
});

test('critical success does not bypass ship requirement for uncapped sum', () => {
  const fishes = [
    { id: 'f1', fishName: 'ShipOnlyFish', fishAmountAvailableNow: 1, fishCodeNumber: { min: 70, max: 100 } }
  ];

  const rng = makeRng([0.99, 0.99, 0.99]);
  const noShip = resolveFishingAttempt({
    normalizedInput: { modifiers: [20, 20, 20], useGuidance: false, baitType: 'basic', useShip: false },
    config: baseConfig,
    fishes,
    rng
  });

  assert.equal(noShip.hasCriticalSuccess, true);
  assert.equal(noShip.finalSum, 65);
  assert.equal(noShip.selectedFish, null);

  const withShip = resolveFishingAttempt({
    normalizedInput: { modifiers: [20, 20, 20], useGuidance: false, baitType: 'basic', useShip: true },
    config: baseConfig,
    fishes,
    rng: makeRng([0.99, 0.99, 0.99, 0.2])
  });

  assert.equal(withShip.finalSum > 65, true);
  assert.equal(withShip.selectedFish.fishName, 'ShipOnlyFish');
});
