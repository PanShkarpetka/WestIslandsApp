import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateBestCrafter,
  getBuildingsAdded,
  getDamagedShips,
  selectBestMageRequest,
  selectDashboardCycles,
  selectLargestFaithSpend,
  summarizeTreasuryTransactions,
  resolveLastExpedition,
  isCycleStartAction,
  getLegacyExpeditionDurationDays,
  buildExpeditionHistory,
} from '../../src/services/dashboardService.js';

test('resolveLastExpedition prefers structured data and falls back to legacy next-cycle notes', () => {
  const structured = { adventureTitle: 'Острів бурі', durationDays: 4 };
  assert.equal(resolveLastExpedition({ expedition: structured }, [{ notes: 'Стара назва' }]), structured);
  assert.deepEqual(resolveLastExpedition({ id: 'old' }, [
    { actionType: { id: 'influence' }, notes: 'Релігійна дія' },
    { actionType: { id: 'cycleStart' }, notes: 'Стара назва' },
  ]), {
    adventureTitle: 'Стара назва',
    durationDays: null,
    legacy: true,
  });
});

test('legacy expedition duration subtracts seven rest days from inclusive cycle dates', () => {
  assert.equal(getLegacyExpeditionDurationDays({
    startedAt: '22 Ches 818 рік після Потопу',
    finishedAt: '5 Tarsakh 818 рік після Потопу',
  }), 7);
  assert.equal(getLegacyExpeditionDurationDays({ duration: 15 }), 8);
  assert.equal(getLegacyExpeditionDurationDays({ duration: 5 }), 0);
  assert.equal(getLegacyExpeditionDurationDays({ startedAt: 'bad', finishedAt: 'bad' }), null);
});

test('buildExpeditionHistory combines structured and legacy expeditions in newest-first order', () => {
  const cycles = [
    { id: 'old', startedAt: '1 Hammer 818', finishedAt: '10 Hammer 818', duration: 10, createdAt: 1 },
    { id: 'finished', startedAt: '11 Hammer 818', finishedAt: '20 Hammer 818', createdAt: 2, expedition: {
      adventureTitle: 'Нова пригода', durationDays: 3, totalCrewCount: 4,
      participants: [{ heroId: 'h1', heroName: 'Ада' }],
    } },
    { id: 'current', startedAt: '21 Hammer 818', finishedAt: null, createdAt: 3 },
  ];
  const actions = [
    { cycleId: 'finished', actionType: { id: 'cycleStart' }, notes: 'Стара пригода' },
  ];

  assert.deepEqual(buildExpeditionHistory(cycles, actions), [
    {
      id: 'finished', adventureTitle: 'Нова пригода', startedAt: '11 Hammer 818', finishedAt: '20 Hammer 818',
      participants: [{ heroId: 'h1', heroName: 'Ада' }], totalCrewCount: 4, durationDays: 3, legacy: false,
    },
    {
      id: 'old', adventureTitle: 'Стара пригода', startedAt: '1 Hammer 818', finishedAt: '10 Hammer 818',
      participants: [], totalCrewCount: null, durationDays: 3, legacy: true,
    },
  ]);
});

test('legacy expedition detection accepts only cycleStart religion actions', () => {
  assert.equal(isCycleStartAction({ actionType: { id: 'cycleStart' } }), true);
  assert.equal(isCycleStartAction({ actionTypeId: 'cycleStart' }), true);
  assert.equal(isCycleStartAction({ actionType: { path: 'religion-action-types/cycleStart' } }), true);
  assert.equal(isCycleStartAction({ actionType: { id: 'awardAdventure' }, notes: 'Not an expedition title' }), false);
  assert.equal(resolveLastExpedition({ id: 'old' }, [{ actionType: { id: 'shield' }, notes: 'Щит' }]), null);
});

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
