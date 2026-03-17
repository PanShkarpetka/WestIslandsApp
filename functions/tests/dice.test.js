import test from 'node:test';
import assert from 'node:assert/strict';
import { rollDie, rollDice } from '../src/utils/dice.js';

test('rollDie returns deterministic value with rng', () => {
  const value = rollDie(20, () => 0.5);
  assert.equal(value, 11);
});

test('rollDice rolls requested count', () => {
  const seq = [0, 0.1, 0.9];
  let idx = 0;
  const rolls = rollDice({ count: 3, sides: 10, rng: () => seq[idx++] });
  assert.deepEqual(rolls, [1, 2, 10]);
});
