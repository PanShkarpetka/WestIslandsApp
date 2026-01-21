import test from 'node:test';
import assert from 'node:assert/strict';
import { apportionFixed } from '../../src/utils/votes.js';

test('apportionFixed distributes totals with fixed precision', () => {
  const result = apportionFixed(10, [1, 2, 3]);
  const sum = result.reduce((acc, value) => acc + value, 0);

  assert.equal(result.length, 3);
  assert.equal(Number(sum.toFixed(1)), 10);
});

test('apportionFixed handles decimal precision', () => {
  const result = apportionFixed(1, [1, 1, 1], 2);
  const sum = result.reduce((acc, value) => acc + value, 0);

  assert.equal(Number(sum.toFixed(2)), 1);
  assert.ok(result.every(value => Number.isFinite(value)));
});

test('apportionFixed returns zeros for non-positive totals or weights', () => {
  assert.deepEqual(apportionFixed(0, [1, 2]), [0, 0]);
  assert.deepEqual(apportionFixed(5, [0, 0]), [0, 0]);
});

test('apportionFixed treats falsy weights as zero', () => {
  const result = apportionFixed(5, [2, null, '3']);
  const sum = result.reduce((acc, value) => acc + value, 0);

  assert.equal(Number(sum.toFixed(1)), 5);
});
