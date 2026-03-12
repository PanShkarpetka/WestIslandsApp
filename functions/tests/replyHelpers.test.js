import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFishingResult } from '../src/telegram/replyHelpers.js';

test('formats fishing result in Ukrainian with HTML formatting', () => {
  const result = {
    normalizedInput: { modifiers: [-2, 4, 3], baitType: 'advanced', useShip: true },
    rawRolls: [15, 3, 11],
    modifiedRolls: [13, 7, 14],
    finalRolls: [15, 11, 18],
    guidance: {
      guidanceRolls: [2, 4, 4],
      totalGuidanceBonus: 10
    },
    baitBonusRoll: 1,
    shipBonusRoll: 4,
    computedSum: 53,
    finalSum: 53,
    eachRollDc: 10,
    passedEachRollDc: true,
    failedRollIndexes: [],
    rolledFish: null,
    effectiveRollUsed: 53
  };

  const reply = formatFishingResult(result, [
    {
      fishName: 'Групер кам’яний',
      fishCodeNumber: { min: 53, max: 53 },
      fishDescription: 'Ховається у підводних печерах. Витягнути важко, бо чіпляється за дно.'
    }
  ], { additionalRollPassed: true });

  assert.match(reply, /🎣 <b>Результат риболовлі<\/b>/);
  assert.match(reply, /🧮 Модифікатори: \(-2\), \(\+4\), \(\+3\)/);
  assert.match(reply, /📊 Сума для пошуку риби: <b><u>53<\/u><\/b>/);
  assert.match(reply, /🐟 Улов: <b>Групер кам’яний<\/b>/);
  assert.match(reply, /<blockquote>Ховається у підводних печерах\./);
  assert.match(reply, /🎉 Додатковий кидок: <b>УСПІХ ✅<\/b>/);
});


test('formats scalar bonus rolls without crashing', () => {
  const result = {
    normalizedInput: { modifiers: [1, 2, 3], baitType: 'simple', useShip: true },
    rawRolls: [1, 2, 3],
    modifiedRolls: [2, 4, 6],
    finalRolls: [2, 4, 6],
    guidance: { guidanceRolls: [], totalGuidanceBonus: 0 },
    baitBonusRoll: 2,
    shipBonusRoll: 3,
    computedSum: 17,
    finalSum: 17,
    eachRollDc: 1,
    passedEachRollDc: true,
    failedRollIndexes: [],
    rolledFish: null,
    effectiveRollUsed: 17
  };

  const reply = formatFishingResult(result, []);
  assert.match(reply, /🪱 Бонус наживки: \(\+2\)/);
  assert.match(reply, /🚢 Бонус корабля: \(\+3\)/);
});

test('shows catch-on-failed-additional-roll message', () => {
  const result = {
    normalizedInput: { modifiers: [1, 2, 3], baitType: 'simple', useShip: false },
    rawRolls: [10, 10, 10],
    modifiedRolls: [11, 12, 13],
    finalRolls: [11, 12, 13],
    guidance: { guidanceRolls: [], totalGuidanceBonus: 0 },
    baitBonusRoll: null,
    shipBonusRoll: null,
    computedSum: 36,
    finalSum: 36,
    eachRollDc: 10,
    passedEachRollDc: true,
    failedRollIndexes: [],
    rolledFish: null,
    effectiveRollUsed: 36
  };

  const reply = formatFishingResult(result, [{
    fishName: 'Test Fish',
    fishCodeNumber: { min: 36, max: 36 },
    fishDescription: 'desc'
  }], { additionalRollCaughtDespiteFailure: true });

  assert.match(reply, /але риба все одно спіймана/);
});

test('shows catch-on-failed-additional-roll message', () => {
  const result = {
    normalizedInput: { modifiers: [1, 2, 3], baitType: 'simple', useShip: false },
    rawRolls: [10, 10, 10],
    modifiedRolls: [11, 12, 13],
    finalRolls: [11, 12, 13],
    guidance: { guidanceRolls: [], totalGuidanceBonus: 0 },
    baitBonusRoll: null,
    shipBonusRoll: null,
    computedSum: 36,
    finalSum: 36,
    eachRollDc: 10,
    passedEachRollDc: true,
    failedRollIndexes: [],
    rolledFish: null,
    effectiveRollUsed: 36
  };

  const reply = formatFishingResult(result, [{
    fishName: 'Test Fish',
    fishCodeNumber: { min: 36, max: 36 },
    fishDescription: 'desc'
  }], { additionalRollCaughtDespiteFailure: true });

  assert.match(reply, /але риба все одно спіймана/);
});
