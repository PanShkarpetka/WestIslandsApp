import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFishValue } from '../../src/utils/fishingUtils.js';

// Helpers
const fish = (code, value) => ({ fishCodeNumber: code, fishValueSilver: value });

test('resolveFishValue returns plain number value directly', () => {
  assert.equal(resolveFishValue(fish({ min: 10, max: 20 }, 50), 15), 50);
});

test('resolveFishValue returns 0 for missing value', () => {
  assert.equal(resolveFishValue(fish({ min: 10, max: 20 }, null), 15), 0);
  assert.equal(resolveFishValue(fish({ min: 10, max: 20 }, undefined), 15), 0);
});

test('resolveFishValue at min roll returns low price', () => {
  const f = fish({ min: 10, max: 20 }, { low: 100, high: 200 });
  assert.equal(resolveFishValue(f, 10), 100);
});

test('resolveFishValue at max roll returns high price', () => {
  const f = fish({ min: 10, max: 20 }, { low: 100, high: 200 });
  assert.equal(resolveFishValue(f, 20), 200);
});

test('resolveFishValue interpolates linearly between min and max roll', () => {
  const f = fish({ min: 10, max: 20 }, { low: 100, high: 200 });
  assert.equal(resolveFishValue(f, 15), 150); // midpoint
  assert.equal(resolveFishValue(f, 12), 120); // 20% of the way
});

test('resolveFishValue clamps roll below min to low price', () => {
  const f = fish({ min: 10, max: 20 }, { low: 100, high: 200 });
  assert.equal(resolveFishValue(f, 5), 100);
});

test('resolveFishValue clamps roll above max to high price', () => {
  const f = fish({ min: 10, max: 20 }, { low: 100, high: 200 });
  assert.equal(resolveFishValue(f, 99), 200);
});

test('resolveFishValue falls back to average when no roll provided', () => {
  const f = fish({ min: 10, max: 20 }, { low: 100, high: 200 });
  assert.equal(resolveFishValue(f, null), 150);
  assert.equal(resolveFishValue(f, undefined), 150);
});

test('resolveFishValue returns high for single-code fish (min === max)', () => {
  const f = fish({ min: 15, max: 15 }, { low: 80, high: 80 });
  assert.equal(resolveFishValue(f, 15), 80);
});

test('resolveFishValue handles equal low and high gracefully', () => {
  const f = fish({ min: 10, max: 20 }, { low: 150, high: 150 });
  assert.equal(resolveFishValue(f, 15), 150);
});
