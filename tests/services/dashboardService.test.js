import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateBestCrafter,
  enrichFaithSpendActions,
  getBuildingsAdded,
  getDamagedShips,
  selectBestFishCatch,
  selectBestMageRequest,
  selectDashboardCycles,
  selectLargestFaithSpend,
  summarizeTreasuryTransactions,
} from '../../src/services/dashboardService.js';

test('selectDashboardCycles returns active current cycle and newest finished cycle', () => {
  const cycles = [
    { id: 'old', startedAt: '1 Hammer', finishedAt: '10 Hammer', createdAt: 1 },
    { id: 'last', startedAt: '11 Hammer', finishedAt: '20 Hammer', createdAt: 2 },
    { id: 'current', startedAt: '21 Hammer', finishedAt: '', createdAt: 3 },
  ];

  const result = selectDashboardCycles(cycles);

  assert.equal(result.currentCycle.id, 'current');
  assert.equal(result.lastFinishedCycle.id, 'last');
});

test('getDamagedShips filters damaged ships and sorts by lowest hp percentage', () => {
  const result = getDamagedShips([
    { id: 'healthy', name: 'Healthy', hp: 20, hpMax: 20, visibility: true },
    { id: 'hidden', name: 'Hidden', hp: 1, hpMax: 20, visibility: false },
    { id: 'legacy-hidden', name: 'Legacy hidden', hp: 1, hpMax: 20, visible: false },
    { id: 'mid', name: 'Mid', hp: 10, hpMax: 20, visibility: true },
    { id: 'low', name: 'Low', hp: 2, hpMax: 20, visible: true },
  ]);

  assert.deepEqual(result.map((ship) => ship.id), ['low', 'mid']);
  assert.equal(result[0].missingHp, 18);
});

test('summarizeTreasuryTransactions returns income expenses and net', () => {
  const result = summarizeTreasuryTransactions([
    { amount: 120 },
    { amount: -40 },
    { amount: 30 },
  ]);

  assert.deepEqual(result, { income: 150, expenses: 40, net: 110, count: 3 });
});

test('selectBestMageRequest ranks fulfilled request by compensation then downtime', () => {
  const result = selectBestMageRequest([
    {
      id: 'doc-1',
      cycleId: 'cycle-1',
      requests: [
        { spellName: 'Low', compensation: 50, downtimeDays: 10, fulfilled: true },
        { spellName: 'High', compensation: 100, downtimeDays: 3, fulfilled: true },
        { spellName: 'Open', compensation: 500, downtimeDays: 1, fulfilled: false },
      ],
    },
    {
      id: 'doc-2',
      cycleId: 'cycle-1',
      requests: [{ spellName: 'Tie Winner', compensation: 100, downtimeDays: 8, fulfilled: true }],
    },
  ]);

  assert.equal(result.spellName, 'Tie Winner');
});

test('selectLargestFaithSpend returns largest explicit faith spend', () => {
  const result = selectLargestFaithSpend([
    { id: 'a', invested: 12 },
    { id: 'b', faithPenalty: 25 },
    { id: 'c', faithGained: 100 },
  ]);

  assert.equal(result.id, 'b');
  assert.equal(result.faithSpent, 25);
});

test('selectLargestFaithSpend recognizes religion action investedFaith field', () => {
  const result = selectLargestFaithSpend([
    { id: 'shield', investedFaith: 50, actionType: { id: 'shield' } },
    { id: 'spread', investedFaith: 100, actionType: { id: 'influence' } },
  ]);

  assert.equal(result.id, 'spread');
  assert.equal(result.faithSpent, 100);
});

test('enrichFaithSpendActions resolves hero names from existing hero records', () => {
  const result = enrichFaithSpendActions(
    [{ id: 'spread', heroId: 'hero-1', investedFaith: 100, user: 'Admin' }],
    [{ id: 'hero-1', name: 'Дік' }],
  );

  assert.equal(result[0].heroName, 'Дік');
});

test('selectBestFishCatch displays linked hero name instead of telegram username', () => {
  const result = selectBestFishCatch([
    {
      heroId: 'hero-1',
      telegramUsername: 'telegram-player',
      successFailureResult: 'success',
      effectiveRollUsed: 12,
      fishSelected: [{ fishName: 'Golden Tuna', fishValueSilver: 80 }],
    },
  ], { heroes: [{ id: 'hero-1', name: 'Каеларіс' }] });

  assert.equal(result.username, 'Каеларіс');
  assert.equal(result.heroName, 'Каеларіс');
});

test('aggregateBestCrafter ranks by total component value', () => {
  const result = aggregateBestCrafter([
    { heroId: 'a', heroName: 'Aela', amountCrafted: 10, totalComponentPriceAtTime: 20 },
    { heroId: 'b', heroName: 'Borin', amountCrafted: 1, totalComponentPriceAtTime: 100 },
    { heroId: 'a', heroName: 'Aela', amountCrafted: 1, totalComponentPriceAtTime: 10 },
  ]);

  assert.equal(result.heroId, 'b');
  assert.equal(result.totalValue, 100);
});

test('getBuildingsAdded filters island buildings by builtCycleId', () => {
  const defs = new Map([['harbor', { name: 'Harbor' }]]);
  const result = getBuildingsAdded({
    harbor: { built: true, builtCycleId: 'cycle-1' },
    tavern: { built: true, builtCycleId: 'cycle-2', name: 'Tavern' },
    farm: { built: false, builtCycleId: 'cycle-1', name: 'Farm' },
  }, defs, 'cycle-1');

  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Harbor');
});

test('selectDashboardCycles handles no finished cycle', () => {
  const result = selectDashboardCycles([{ id: 'current', startedAt: '1 Hammer', createdAt: 1 }]);

  assert.equal(result.currentCycle.id, 'current');
  assert.equal(result.lastFinishedCycle, null);
});
