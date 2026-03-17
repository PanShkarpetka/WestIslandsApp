import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAvailabilityGuard } from '../src/services/firestoreService.js';

test('stock update guard never drops below zero', () => {
  const result = applyAvailabilityGuard(1, 5);
  assert.equal(result.awarded, 1);
  assert.equal(result.after, 0);
});
