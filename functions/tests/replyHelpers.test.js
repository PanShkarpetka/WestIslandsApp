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
  assert.match(reply, /🎉 Додатковий кидок: <b>PASS ✅<\/b>/);
});
