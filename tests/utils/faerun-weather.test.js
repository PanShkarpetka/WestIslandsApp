import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCycleWeatherForecast,
  generateRollingCycleWeatherForecast,
  getRealWeatherDayOffset,
  getWeatherPoolForSeason,
  resolveCycleWeather,
} from '../../src/utils/faerun-weather.js';

test('generateCycleWeatherForecast is deterministic for the same cycle and start date', () => {
  const first = generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: '1 Flamerule 815 рік після Потопу' });
  const second = generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: '1 Flamerule 815 рік після Потопу' });

  assert.deepEqual(first, second);
});

test('generateCycleWeatherForecast returns seven consecutive forecast days', () => {
  const forecast = generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: '28 Uktar 815 рік після Потопу' });

  assert.equal(forecast.length, 7);
  assert.deepEqual(forecast.map((day) => day.dayOffset), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(forecast[0].date, '28 Uktar 815 рік після Потопу');
  assert.equal(forecast[3].date, '1 Nightal 815 рік після Потопу');
});

test('weather pools differ by season and include seasonal extremes', () => {
  const winterIds = getWeatherPoolForSeason('winter').map((item) => item.id);
  const summerIds = getWeatherPoolForSeason('summer').map((item) => item.id);

  assert.notDeepEqual(winterIds, summerIds);
  assert.equal(winterIds.includes('snow'), false);
  assert.equal(winterIds.includes('anomalous-chill'), true);
  assert.equal(summerIds.includes('scorching-heat'), true);
  assert.equal(summerIds.includes('tropical-storm'), true);
});

test('generateCycleWeatherForecast returns empty array for invalid date', () => {
  assert.deepEqual(generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: 'bad input' }), []);
});

test('getRealWeatherDayOffset advances at midnight in Kyiv time', () => {
  const cycle = { createdAt: '2026-06-23T10:00:00.000Z' };

  assert.equal(getRealWeatherDayOffset(cycle, { now: new Date('2026-06-23T20:59:00.000Z') }), 0);
  assert.equal(getRealWeatherDayOffset(cycle, { now: new Date('2026-06-23T21:00:00.000Z') }), 1);
});

test('resolveCycleWeather uses real-day offset from cycle creation date', () => {
  const cycle = {
    createdAt: '2026-06-23T10:00:00.000Z',
    weatherForecast: [
      { title: 'Day 0' },
      { title: 'Day 1' },
      { title: 'Day 2' },
    ],
  };

  assert.equal(resolveCycleWeather(cycle, { now: new Date('2026-06-23T20:59:00.000Z') }).title, 'Day 0');
  assert.equal(resolveCycleWeather(cycle, { now: new Date('2026-06-23T21:00:00.000Z') }).title, 'Day 1');
  assert.equal(resolveCycleWeather(cycle, { now: new Date('2026-06-25T12:00:00.000Z') }).title, 'Day 2');
});

test('resolveCycleWeather generates deterministic weather beyond stored forecast days', () => {
  const cycle = {
    id: 'cycle-1',
    startedAt: '1 Ches 818 рік після Потопу',
    createdAt: '2026-06-23T10:00:00.000Z',
    weatherForecast: generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: '1 Ches 818 рік після Потопу' }),
  };

  const weather = resolveCycleWeather(cycle, { now: new Date('2026-07-02T12:00:00.000Z') });

  assert.equal(weather.dayOffset, 9);
  assert.equal(weather.date, '10 Ches 818 рік після Потопу');
});

test('generateRollingCycleWeatherForecast returns the next seven real-day forecast entries', () => {
  const cycle = {
    id: 'cycle-1',
    startedAt: '1 Ches 818 рік після Потопу',
    createdAt: '2026-06-23T10:00:00.000Z',
  };

  const forecast = generateRollingCycleWeatherForecast(cycle, { now: new Date('2026-06-26T12:00:00.000Z') });

  assert.equal(forecast.length, 7);
  assert.deepEqual(forecast.map((day) => day.dayOffset), [3, 4, 5, 6, 7, 8, 9]);
  assert.equal(forecast[0].date, '4 Ches 818 рік після Потопу');
});
