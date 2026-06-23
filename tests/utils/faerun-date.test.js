import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_YEAR,
  clampDay,
  formatFaerunDate,
  parseFaerunDate,
  addFaerunDays,
  diffInDays,
  getFaerunSeason,
  normalizeFaerunDate,
} from '../../src/utils/faerun-date.js';

test('DEFAULT_YEAR is the current campaign year', () => {
  assert.equal(DEFAULT_YEAR, 818);
});

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
  assert.equal(diff, 2);
});

test('normalizeFaerunDate returns normalized data', () => {
  const normalized = normalizeFaerunDate({ day: 0, month: 'Eleint' });
  assert.deepEqual(normalized, { day: 1, month: 8, year: 818 });
});

test('addFaerunDays advances across month and year boundaries', () => {
  assert.deepEqual(addFaerunDays({ day: 30, month: 'Nightal', year: 815 }, 1), { day: 1, month: 0, year: 816 });
  assert.deepEqual(addFaerunDays({ day: 28, month: 'Uktar', year: 815 }, 3), { day: 1, month: 11, year: 815 });
});

test('getFaerunSeason maps each month to the expected season', () => {
  const cases = [
    ['Hammer', 'winter'],
    ['Alturiak', 'winter'],
    ['Ches', 'spring'],
    ['Tarsakh', 'spring'],
    ['Mirtul', 'spring'],
    ['Kythorn', 'summer'],
    ['Flamerule', 'summer'],
    ['Eleasis', 'summer'],
    ['Eleint', 'autumn'],
    ['Marpenoth', 'autumn'],
    ['Uktar', 'autumn'],
    ['Nightal', 'winter'],
  ];

  for (const [month, expectedSeason] of cases) {
    assert.equal(getFaerunSeason({ day: 1, month, year: 815 }).id, expectedSeason);
  }
});

test('getFaerunSeason accepts a Faerun date string', () => {
  const season = getFaerunSeason('1 Hammer 815 рік після Потопу');
  assert.deepEqual(season, {
    id: 'winter',
    name: 'Зима',
    label: 'Пора року: Зима',
    icon: 'mdi-snowflake',
  });
});

test('getFaerunSeason returns null for invalid input', () => {
  assert.equal(getFaerunSeason('bad input'), null);
  assert.equal(getFaerunSeason(null), null);
  assert.equal(getFaerunSeason({ day: 1, month: 'Unknown', year: 815 }), null);
});
