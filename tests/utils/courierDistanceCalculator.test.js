import test from 'node:test';
import assert from 'node:assert/strict';
import { didCreatureGetToTarget } from '../../src/utils/courierDistanceCalculator.js';

function createLogger() {
  return { log: () => {} };
}

function mockRandom(sequence, fallback = 0.5) {
  const original = Math.random;
  let index = 0;
  Math.random = () => (index < sequence.length ? sequence[index++] : fallback);
  return () => {
    Math.random = original;
  };
}

test('returns false when danger happens immediately', () => {
  const restore = mockRandom([0]);
  const result = didCreatureGetToTarget(createLogger(), 10, 30, 0, 100);
  restore();

  assert.equal(result, false);
});

test('returns true when target is within safe travel distance', () => {
  const restore = mockRandom([0.5]);
  const result = didCreatureGetToTarget(createLogger(), 10, 30, 0, 0);
  restore();

  assert.equal(result, true);
});

test('returns true for extended travel with strong constitution', () => {
  const restore = mockRandom([0.5]);
  const result = didCreatureGetToTarget(createLogger(), 50, 30, 100, 0);
  restore();

  assert.equal(result, true);
});
