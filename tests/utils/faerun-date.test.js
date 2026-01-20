import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDay,
  formatFaerunDate,
  parseFaerunDate,
  diffInDays,
  normalizeFaerunDate,
} from '../../src/utils/faerun-date.js';

test('clampDay keeps values within 1..30', () => {
  assert.equal(clampDay(0), 1);
  assert.equal(clampDay(15), 15);
  assert.equal(clampDay(99), 30);
});

test('formatFaerunDate renders a valid date string', () => {
  const formatted = formatFaerunDate({ day: 5, month: 'Tarsakh', year: 820 });
  assert.equal(formatted, '5 Tarsakh 820 рік після Потопу');
});

test('formatFaerunDate returns empty string for invalid month', () => {
  const formatted = formatFaerunDate({ day: 5, month: 'Unknown', year: 820 });
  assert.equal(formatted, '');
});

test('parseFaerunDate parses valid strings and clamps day', () => {
  const parsed = parseFaerunDate('35 Ches 900 рік після Потопу');
  assert.deepEqual(parsed, { day: 30, month: 2, year: 900 });
});

test('parseFaerunDate returns null for invalid input', () => {
  assert.equal(parseFaerunDate('bad input'), null);
});

test('diffInDays returns null for invalid months', () => {
  const diff = diffInDays({ day: 1, month: 'Unknown' }, { day: 2, month: 'Ches' });
  assert.equal(diff, null);
});

test('diffInDays returns day difference across dates', () => {
  const diff = diffInDays({ day: 1, month: 'Hammer', year: 815 }, { day: 2, month: 'Hammer', year: 815 });
  assert.equal(diff, 1);
});

test('normalizeFaerunDate returns normalized data', () => {
  const normalized = normalizeFaerunDate({ day: 0, month: 'Eleint' });
  assert.deepEqual(normalized, { day: 1, month: 8, year: 815 });
});
