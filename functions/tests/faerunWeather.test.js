import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCycleWeatherForecast,
  generateRollingCycleWeatherForecast,
  getRealWeatherDayOffset,
  getWeatherPoolForSeason,
  resolveCycleWeather
} from '../src/utils/faerunWeather.js';

test('weather forecast is deterministic and seven days long', () => {
  const first = generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: '1 Flamerule 815 рік після Потопу' });
  const second = generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: '1 Flamerule 815 рік після Потопу' });

  assert.equal(first.length, 7);
  assert.deepEqual(first, second);
});

test('seasonal pools keep winter oceanic and summer hot', () => {
  const winterIds = getWeatherPoolForSeason('winter').map((item) => item.id);
  const summerIds = getWeatherPoolForSeason('summer').map((item) => item.id);

  assert.equal(winterIds.includes('snow'), false);
  assert.equal(winterIds.includes('anomalous-chill'), true);
  assert.equal(summerIds.includes('scorching-heat'), true);
  assert.equal(summerIds.includes('tropical-storm'), true);
});

test('resolveCycleWeather uses stored forecast before fallback', () => {
  const weather = { weatherId: 'stored', title: 'Stored weather', effects: { dcModifier: 1 } };
  assert.deepEqual(resolveCycleWeather({ id: 'c1', startedAt: '1 Hammer 815', weatherForecast: [weather] }), weather);
});

test('weather day offset advances at midnight in Kyiv time', () => {
  const cycle = { createdAt: '2026-06-23T10:00:00.000Z' };

  assert.equal(getRealWeatherDayOffset(cycle, { now: new Date('2026-06-23T20:59:00.000Z') }), 0);
  assert.equal(getRealWeatherDayOffset(cycle, { now: new Date('2026-06-23T21:00:00.000Z') }), 1);
});

test('resolveCycleWeather chooses stored forecast day by real date', () => {
  const cycle = {
    createdAt: '2026-06-23T10:00:00.000Z',
    weatherForecast: [
      { title: 'Day 0' },
      { title: 'Day 1' },
      { title: 'Day 2' }
    ]
  };

  assert.equal(resolveCycleWeather(cycle, { now: new Date('2026-06-23T20:59:00.000Z') }).title, 'Day 0');
  assert.equal(resolveCycleWeather(cycle, { now: new Date('2026-06-23T21:00:00.000Z') }).title, 'Day 1');
  assert.equal(resolveCycleWeather(cycle, { now: new Date('2026-06-25T12:00:00.000Z') }).title, 'Day 2');
});

test('resolveCycleWeather generates deterministic weather beyond stored forecast days', () => {
  const cycle = {
    id: 'cycle-1',
    startedAt: '1 Ches 818 СЂС–Рє РїС–СЃР»СЏ РџРѕС‚РѕРїСѓ',
    createdAt: '2026-06-23T10:00:00.000Z',
    weatherForecast: generateCycleWeatherForecast({ cycleId: 'cycle-1', startedAt: '1 Ches 818 СЂС–Рє РїС–СЃР»СЏ РџРѕС‚РѕРїСѓ' })
  };

  const weather = resolveCycleWeather(cycle, { now: new Date('2026-07-02T12:00:00.000Z') });

  assert.equal(weather.dayOffset, 9);
  assert.equal(weather.date, '10 Ches 818 рік після Потопу');
});

test('generateRollingCycleWeatherForecast returns the next seven real-day forecast entries', () => {
  const cycle = {
    id: 'cycle-1',
    startedAt: '1 Ches 818 СЂС–Рє РїС–СЃР»СЏ РџРѕС‚РѕРїСѓ',
    createdAt: '2026-06-23T10:00:00.000Z'
  };

  const forecast = generateRollingCycleWeatherForecast(cycle, { now: new Date('2026-06-26T12:00:00.000Z') });

  assert.equal(forecast.length, 7);
  assert.deepEqual(forecast.map((day) => day.dayOffset), [3, 4, 5, 6, 7, 8, 9]);
  assert.equal(forecast[0].date, '4 Ches 818 рік після Потопу');
});
