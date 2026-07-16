import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resetReligionsSvTemp,
  loadManufacturesByIds,
  distributeManufactureIncome,
  distributeBuildingFaithIncome,
  consumeDevaFaithForMonthChange,
  createNewCycleWithEffects,
  processBuildingYields,
  rerunCycleAutoMoney,
  buildExpeditionDetails,
  updateExpeditionDetails,
} from '../../src/services/cycleService.js';
import { createMockFirestore } from '../helpers/mockFirestore.js';

// ─── resetReligionsSvTemp ────────────────────────────────────────────────────

test('resetReligionsSvTemp sets svTemp to 0 on all religion docs', async () => {
  const mock = createMockFirestore({
    'religions/rel1': { name: 'Tyr', svTemp: 5 },
    'religions/rel2': { name: 'Helm', svTemp: 12 },
  });

  await resetReligionsSvTemp({ ...mock.firebase, db: mock.db });

  assert.equal(mock.get('religions/rel1').svTemp, 0);
  assert.equal(mock.get('religions/rel2').svTemp, 0);
});

test('resetReligionsSvTemp does nothing when collection is empty', async () => {
  const mock = createMockFirestore({});
  await assert.doesNotReject(() => resetReligionsSvTemp({ ...mock.firebase, db: mock.db }));
});

// ─── loadManufacturesByIds ───────────────────────────────────────────────────

test('loadManufacturesByIds returns normalised manufacture entries', async () => {
  const mock = createMockFirestore({
    'manufactures/m1': { name: '  Mine  ', income: 100, incomeDestination: 'treasury' },
    'manufactures/m2': { name: 'Farm', income: 50, incomeDestination: 'guild:guild-a' },
  });

  const result = await loadManufacturesByIds(['m1', 'm2'], { ...mock.firebase, db: mock.db });

  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'Mine');
  assert.equal(result[0].income, 100);
  assert.equal(result[1].incomeDestination, 'guild:guild-a');
  // composite id includes manufacture id
  assert.ok(result[0].id.startsWith('m1'));
  assert.equal(result[0].manufactureId, 'm1');
});

test('loadManufacturesByIds returns empty array for empty ids', async () => {
  const mock = createMockFirestore({});
  const result = await loadManufacturesByIds([], { ...mock.firebase, db: mock.db });
  assert.deepEqual(result, []);
});

test('loadManufacturesByIds preserves requested order', async () => {
  const mock = createMockFirestore({
    'manufactures/a': { name: 'A', income: 10, incomeDestination: 'treasury' },
    'manufactures/b': { name: 'B', income: 20, incomeDestination: 'treasury' },
  });

  const result = await loadManufacturesByIds(['b', 'a'], { ...mock.firebase, db: mock.db });

  assert.equal(result[0].manufactureId, 'b');
  assert.equal(result[1].manufactureId, 'a');
});

test('loadManufacturesByIds expands multi-payout manufactures into separate entries', async () => {
  const mock = createMockFirestore({
    'manufactures/m1': {
      name: 'Mine',
      payouts: [
        { destination: 'treasury', income: 100 },
        { destination: 'hero:hero-1', income: 5, incomeGoods: { 'barrel': 2 } },
      ],
    },
  });

  const result = await loadManufacturesByIds(['m1'], { ...mock.firebase, db: mock.db });

  assert.equal(result.length, 2);
  assert.equal(result[0].manufactureId, 'm1');
  assert.equal(result[0].income, 100);
  assert.equal(result[0].incomeDestination, 'treasury');
  assert.equal(result[1].income, 5);
  assert.equal(result[1].incomeDestination, 'hero:hero-1');
  assert.equal(result[1].incomeGoods['barrel'], 2);
});

test('loadManufacturesByIds accepts incomeDestination in payout rows', async () => {
  const mock = createMockFirestore({
    'manufactures/m1': {
      name: 'Mixed legacy payouts',
      payouts: [
        { incomeDestination: 'guild:guild-a', income: 25 },
        { incomeDestination: 'hero:hero-1', income: 5, incomeGoods: { barrel: 1 } },
      ],
    },
  });

  const result = await loadManufacturesByIds(['m1'], { ...mock.firebase, db: mock.db });

  assert.equal(result.length, 2);
  assert.equal(result[0].incomeDestination, 'guild:guild-a');
  assert.equal(result[0].income, 25);
  assert.equal(result[1].incomeDestination, 'hero:hero-1');
  assert.deepEqual(result[1].incomeGoods, { barrel: 1 });
});

test('loadManufacturesByIds preserves Coin Pig payout config', async () => {
  const mock = createMockFirestore({
    'manufactures/m1': {
      name: 'Coin Pig',
      payouts: [
        { mechanic: 'coinPig', participantHeroIds: ['hero-1', 'hero-2', 'hero-1'], roll: '1d4-1' },
      ],
    },
  });

  const result = await loadManufacturesByIds(['m1'], { ...mock.firebase, db: mock.db });

  assert.equal(result.length, 1);
  assert.equal(result[0].mechanic, 'coinPig');
  assert.deepEqual(result[0].participantHeroIds, ['hero-1', 'hero-2']);
  assert.equal(result[0].income, 0);
});

// ─── distributeManufactureIncome ─────────────────────────────────────────────

test('distributeManufactureIncome adds treasury balance from population income', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 1000 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock',
    [{ id: 'p1', name: 'Merchants', count: 10, incomePerPerson: 5, description: '' }],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('treasury/meta').balance, 1050);

  const txs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].amount, 50);
  assert.equal(txs[0].type, 'deposit');
  assert.equal(txs[0].userId, 'system');
  assert.equal(txs[0].cycleId, 'cycle-1');
});

test('distributeManufactureIncome routes guild-destined manufacture income to guild', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': { name: 'Quarry', income: 200, incomeDestination: 'guild:guild-a' },
    'guilds/guild-a': { treasure: 300 },
    'treasury/meta': { balance: 500 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('guilds/guild-a').treasure, 500);
  assert.equal(mock.get('treasury/meta').balance, 500); // treasury unchanged

  const guildLogs = Object.values(mock.list('guilds/guild-a/logs'));
  assert.equal(guildLogs.length, 1);
  assert.equal(guildLogs[0].amount, 200);
});

test('distributeManufactureIncome does nothing when island has no income sources', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(Object.keys(mock.list('treasury-transactions')).length, 0);
});

test('distributeManufactureIncome does nothing when island doc is missing', async () => {
  const mock = createMockFirestore({ 'treasury/meta': { balance: 100 } });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'nonexistent_island', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('treasury/meta').balance, 100);
});

test('distributeManufactureIncome credits Coin Pig shares from previous cycle days', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': {
      name: 'Coin Pig',
      payouts: [{ mechanic: 'coinPig', participantHeroIds: ['hero-1', 'hero-2'], roll: '1d4-1' }],
    },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 10, goods: {} },
    'heroes/hero-2': { name: 'Faramir', goldBalance: 4, goods: {} },
    'treasury/meta': { balance: 0 },
  });
  const rngValues = [0, 0.5, 0.99];

  await distributeManufactureIncome(
    'new-cycle', '4 Hammer 1490', null, 'island_rock', [],
    {
      ...mock.firebase,
      db: mock.db,
      rng: () => rngValues.shift() ?? 0,
      coinPigCycle: {
        cycleId: 'prev-cycle',
        startedAt: '1 Hammer 1490',
        finishedAt: '3 Hammer 1490',
        durationDays: 3,
      },
    },
  );

  assert.equal(mock.get('heroes/hero-1').goldBalance, 12.5);
  assert.equal(mock.get('heroes/hero-2').goldBalance, 6.5);
  assert.equal(mock.get('treasury/meta').balance, 0);

  const txs = Object.values(mock.list('hero-transactions')).sort((a, b) => a.heroId.localeCompare(b.heroId));
  assert.equal(txs.length, 2);
  assert.equal(txs[0].goldAmount, 2.5);
  assert.equal(txs[0].cycleId, 'prev-cycle');
  assert.equal(txs[0].cycleStartedAt, '1 Hammer 1490');
  assert.equal(txs[0].cycleFinishedAt, '3 Hammer 1490');
  assert.equal(txs[0].manufactureMechanic, 'coinPig');
  assert.ok(txs[0].comment.includes('1d4-1'));
});

test('distributeManufactureIncome rounds Coin Pig participant shares to 0.01', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': {
      name: 'Coin Pig',
      payouts: [{ mechanic: 'coinPig', participantHeroIds: ['hero-1', 'hero-2', 'hero-3'] }],
    },
    'heroes/hero-1': { name: 'One', goldBalance: 0, goods: {} },
    'heroes/hero-2': { name: 'Two', goldBalance: 0, goods: {} },
    'heroes/hero-3': { name: 'Three', goldBalance: 0, goods: {} },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'new-cycle', '2 Hammer 1490', null, 'island_rock', [],
    {
      ...mock.firebase,
      db: mock.db,
      rng: () => 0.5, // 1d4 = 3, so 1d4-1 = 2 total for one day
      coinPigCycle: {
        cycleId: 'prev-cycle',
        startedAt: '1 Hammer 1490',
        finishedAt: '1 Hammer 1490',
        durationDays: 1,
      },
    },
  );

  const balances = [
    mock.get('heroes/hero-1').goldBalance,
    mock.get('heroes/hero-2').goldBalance,
    mock.get('heroes/hero-3').goldBalance,
  ];
  assert.deepEqual(balances, [0.67, 0.67, 0.66]);
  assert.equal(balances.reduce((sum, value) => sum + value, 0), 2);
});

test('distributeManufactureIncome routes payout rows with incomeDestination', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': {
      name: 'Auto ledger',
      type: 'auto',
      payouts: [
        { incomeDestination: 'guild:guild-a', income: 25 },
        { incomeDestination: 'hero:hero-1', income: 5, incomeGoods: { barrel: 1 } },
      ],
    },
    'guilds/guild-a': { treasure: 10 },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 1, goods: {} },
    'treasury/meta': { balance: 100 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('guilds/guild-a').treasure, 35);
  assert.equal(mock.get('heroes/hero-1').goldBalance, 6);
  assert.equal(mock.get('heroes/hero-1').goods.barrel, 1);
  assert.equal(mock.get('treasury/meta').balance, 100);
});

test('rerunCycleAutoMoney applies money only and records operation status logs', async () => {
  const mock = createMockFirestore({
    'cycles/prev': { startedAt: '1 Hammer 1490', finishedAt: '3 Hammer 1490', duration: 3 },
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': {
      name: 'Auto ledger',
      payouts: [
        { destination: 'treasury', income: 30 },
        { destination: 'hero:hero-1', income: 5, incomeGoods: { barrel: 2 } },
      ],
    },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 1, goods: {} },
    'treasury/meta': { balance: 100 },
  });

  const result = await rerunCycleAutoMoney(
    'prev',
    'island_rock',
    [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(result.status, 'done');
  assert.equal(mock.get('treasury/meta').balance, 130);
  assert.equal(mock.get('heroes/hero-1').goldBalance, 6);
  assert.deepEqual(mock.get('heroes/hero-1').goods, {});
  assert.equal(mock.get('cycles/prev').autoIncomeOperation.status, 'done');
  assert.equal(mock.get('cycles/prev').autoIncomeOperation.logCount, 2);
  assert.deepEqual(
    mock.get('cycles/prev').autoIncomeOperation.logs.map((log) => log.targetType),
    ['treasury', 'hero'],
  );
});

test('distributeManufactureIncome skips Coin Pig when previous duration is unavailable', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': {
      name: 'Coin Pig',
      payouts: [{ mechanic: 'coinPig', participantHeroIds: ['hero-1'] }],
    },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 10, goods: {} },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'new-cycle', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('heroes/hero-1').goldBalance, 10);
  assert.equal(Object.values(mock.list('hero-transactions')).length, 0);
});

// ─── distributeManufactureIncome — bureaucrat effects ────────────────────────

test('distributeManufactureIncome — no bureaucrats: income unchanged (regression)', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock',
    [{ id: 'p1', name: 'Merchants', count: 100, incomePerPerson: 5, description: '' }],
    { ...mock.firebase, db: mock.db, rng: () => 0 },
  );

  assert.equal(mock.get('treasury/meta').balance, 500);
  const txs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txs.length, 1);
  assert.ok(!txs[0].comment.includes('бюрократ'), 'comment should not mention bureaucrats');
});

test('distributeManufactureIncome — full coverage: bonus income applied', async () => {
  // 1 bureaucrat covers 100 people; rng always 0.10 < 0.20 → every covered person pays bonus
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  // bonus per person = max(5 * 0.20, 0.01) = 1.00; 100 people all trigger → +100
  // civilian income: 100 * 5 + 100 = 600
  // bureaucrat cost: 1 * (-1) = -1
  // net: 599
  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock',
    [
      { id: 'b1', name: 'Бюрократи', count: 1, incomePerPerson: -1, faction: 'bureaucrats', description: '' },
      { id: 'p1', name: 'Merchants', count: 100, incomePerPerson: 5, description: '' },
    ],
    { ...mock.firebase, db: mock.db, rng: () => 0.10 },
  );

  assert.equal(mock.get('treasury/meta').balance, 599);
  const txs = Object.values(mock.list('treasury-transactions'));
  const civilianTx = txs.find((t) => t.comment.includes('Merchants'));
  assert.ok(civilianTx, 'civilian transaction should exist');
  assert.ok(civilianTx.comment.includes('бонус бюрократів'), 'comment should mention bureaucrat bonus');
});

test('distributeManufactureIncome — partial coverage: uncovered persons skip payment', async () => {
  // 1 bureaucrat (capacity=100), civilians=200 → covered=100, uncovered=100, isFull=false
  // rng always 0.10 < 0.20 → every uncovered person skips
  // civilian income: 200 * 3 - 100 * 3 = 300
  // bureaucrat cost: -1
  // net: 299
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock',
    [
      { id: 'b1', name: 'Бюрократи', count: 1, incomePerPerson: -1, faction: 'bureaucrats', description: '' },
      { id: 'p1', name: 'Farmers', count: 200, incomePerPerson: 3, description: '' },
    ],
    { ...mock.firebase, db: mock.db, rng: () => 0.10 },
  );

  assert.equal(mock.get('treasury/meta').balance, 299);
  const txs = Object.values(mock.list('treasury-transactions'));
  const civilianTx = txs.find((t) => t.comment.includes('Farmers'));
  assert.ok(civilianTx.comment.includes('несплачено (без нагляду)'), 'comment should mention penalty');
  assert.ok(!civilianTx.comment.includes('бонус бюрократів'), 'no bonus when not full coverage');
});

test('distributeManufactureIncome — bureaucrat group produces withdraw transaction', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 100 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock',
    [{ id: 'b1', name: 'Бюрократи', count: 3, incomePerPerson: -1, faction: 'bureaucrats', description: '' }],
    { ...mock.firebase, db: mock.db, rng: () => 0 },
  );

  assert.equal(mock.get('treasury/meta').balance, 97);
  const txs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].type, 'withdraw');
  assert.equal(txs[0].amount, -3);
});

test('distributeManufactureIncome — zero bureaucrat count: no effect on civilians', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock',
    [
      { id: 'b1', name: 'Бюрократи', count: 0, incomePerPerson: -1, faction: 'bureaucrats', description: '' },
      { id: 'p1', name: 'Traders', count: 50, incomePerPerson: 4, description: '' },
    ],
    { ...mock.firebase, db: mock.db, rng: () => 0.10 },
  );

  // Bureaucrat group has income 0 so filtered out; only civilian income = 200
  assert.equal(mock.get('treasury/meta').balance, 200);
  const txs = Object.values(mock.list('treasury-transactions'));
  const civilianTx = txs.find((t) => t.comment.includes('Traders'));
  assert.ok(civilianTx, 'civilian tx exists');
  assert.ok(!civilianTx.comment.includes('бюрократ'), 'no bureaucrat mention when count=0');
});

test('distributeManufactureIncome — only bureaucrats, no civilians: single withdraw tx', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 50 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock',
    [{ id: 'b1', name: 'Бюрократи', count: 10, incomePerPerson: -1, faction: 'bureaucrats', description: '' }],
    { ...mock.firebase, db: mock.db, rng: () => 0.10 },
  );

  assert.equal(mock.get('treasury/meta').balance, 40);
  const txs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].type, 'withdraw');
});

// ─── distributeBuildingFaithIncome ───────────────────────────────────────────

test('distributeBuildingFaithIncome distributes faith to eligible clergy', async () => {
  const mock = createMockFirestore({
    'religions/rel1': { name: 'Tyr', buildingLevel: 'chapel' }, // chapel gives 5 passive faith
    'clergy/c1': { faith: 0, faithMax: 0, religion: { __path: 'religions/rel1', __type: 'doc' } },
  });

  await distributeBuildingFaithIncome('cycle-1', {
    ...mock.firebase,
    db: mock.db,
    rng: () => 0,
  });

  const clergy = mock.get('clergy/c1');
  assert.ok(clergy.faith > 0, 'faith should increase');

  const logs = Object.values(mock.list('clergy/c1/logs'));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].cycleId, 'cycle-1');
  assert.equal(logs[0].user, 'Система');
});

test('distributeBuildingFaithIncome skips religions with no building', async () => {
  const mock = createMockFirestore({
    'religions/rel1': { name: 'Tyr', buildingLevel: 'none' },
    'clergy/c1': { faith: 0, faithMax: 0, religion: { __path: 'religions/rel1', __type: 'doc' } },
  });

  await distributeBuildingFaithIncome('cycle-1', { ...mock.firebase, db: mock.db, rng: () => 0 });

  assert.equal(mock.get('clergy/c1').faith, 0);
});

test('distributeBuildingFaithIncome skips clergy with passiveOVInactive hero', async () => {
  const mock = createMockFirestore({
    'religions/rel1': { name: 'Tyr', buildingLevel: 'chapel' },
    'heroes/h1': { passiveOVInactive: true },
    'clergy/c1': {
      faith: 0, faithMax: 0,
      religion: { __path: 'religions/rel1', __type: 'doc' },
      hero: { __path: 'heroes/h1', __type: 'doc' },
    },
  });

  await distributeBuildingFaithIncome('cycle-1', { ...mock.firebase, db: mock.db, rng: () => 0 });

  assert.equal(mock.get('clergy/c1').faith, 0);
});

// ─── consumeDevaFaithForMonthChange ─────────────────────────────────────────

test('consumeDevaFaithForMonthChange deducts 30 days of faith at a new month', async () => {
  const mock = createMockFirestore({
    'religions/psevdo/customs/Deva': { devaFaith: 80, devaFaithPerDay: 2, deathMarkers: 0 },
  });

  const consumed = await consumeDevaFaithForMonthChange(
    'cycle-new',
    { day: 1, month: 2, year: 1490 },
    { day: 24, month: 1, year: 1490 },
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(consumed, true);
  assert.equal(mock.get('religions/psevdo/customs/Deva').devaFaith, 20);
  assert.equal(mock.get('religions/psevdo/customs/Deva').lastConsumedCycleId, 'cycle-new');
});

test('consumeDevaFaithForMonthChange deducts faith when the new month cycle starts after day one', async () => {
  const mock = createMockFirestore({
    'religions/psevdo/customs/Deva': { devaFaith: 80, devaFaithPerDay: 2, deathMarkers: 0 },
  });

  const consumed = await consumeDevaFaithForMonthChange(
    'cycle-new',
    { day: 3, month: 2, year: 1490 },
    { day: 24, month: 1, year: 1490 },
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(consumed, true);
  assert.equal(mock.get('religions/psevdo/customs/Deva').devaFaith, 20);
  assert.equal(mock.get('religions/psevdo/customs/Deva').lastConsumedCycleId, 'cycle-new');
});

test('consumeDevaFaithForMonthChange ignores cycles that do not start a new month', async () => {
  const mock = createMockFirestore({
    'religions/psevdo/customs/Deva': { devaFaith: 80, devaFaithPerDay: 2 },
  });

  const consumed = await consumeDevaFaithForMonthChange(
    'cycle-new',
    { day: 8, month: 2, year: 1490 },
    { day: 1, month: 2, year: 1490 },
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(consumed, false);
  assert.equal(mock.get('religions/psevdo/customs/Deva').devaFaith, 80);
});

test('consumeDevaFaithForMonthChange is idempotent for the same cycle', async () => {
  const mock = createMockFirestore({
    'religions/psevdo/customs/Deva': { devaFaith: 80, devaFaithPerDay: 1 },
  });
  const args = [
    'cycle-new',
    { day: 1, month: 2, year: 1490 },
    { day: 24, month: 1, year: 1490 },
    { ...mock.firebase, db: mock.db },
  ];

  await consumeDevaFaithForMonthChange(...args);
  const consumedAgain = await consumeDevaFaithForMonthChange(...args);

  assert.equal(consumedAgain, false);
  assert.equal(mock.get('religions/psevdo/customs/Deva').devaFaith, 50);
});

// ─── createNewCycleWithEffects ───────────────────────────────────────────────

test('createNewCycleWithEffects creates cycle doc with startedAt', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  const result = await createNewCycleWithEffects(
    { startedDate: '1 Hammer 1490', islandId: 'island_rock' },
    {
      ...mock.firebase,
      db: mock.db,
      settlePreviousSpellRequestsFn: async () => {},
      generateSpellRequestsForCycleFn: async () => {},
    },
  );

  assert.ok(result.id, 'should return cycle id');
  assert.ok(result.startedAt, 'should return startedAt');

  const cycles = Object.values(mock.list('cycles'));
  assert.equal(cycles.length, 1);
  assert.ok(cycles[0].startedAt);
  assert.equal(cycles[0].weatherForecast.length, 7);
  assert.equal(cycles[0].weatherForecast[0].date, '1 Hammer 1490 рік після Потопу');
});

test('createNewCycleWithEffects closes open previous cycle', async () => {
  const mock = createMockFirestore({
    'cycles/prev': { startedAt: '1 Uktar 1489', populationAtStart: 90, createdAt: 'old' },
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await createNewCycleWithEffects(
    { startedDate: '1 Hammer 1490', islandId: 'island_rock', population: 120 },
    {
      ...mock.firebase,
      db: mock.db,
      getDocs: async (q) => {
        // Return prev cycle for the "last cycle" query
        if (q.__colPath === 'cycles') {
          return {
            docs: [{ id: 'prev', data: () => mock.get('cycles/prev'), ref: { __path: 'cycles/prev', __type: 'doc', id: 'prev' } }],
            empty: false,
          };
        }
        return mock.firebase.getDocs(q);
      },
      settlePreviousSpellRequestsFn: async () => {},
      generateSpellRequestsForCycleFn: async () => {},
    },
  );

  assert.ok(mock.get('cycles/prev').finishedAt, 'previous cycle should be closed');
  const summary = mock.get('cycle-summaries/prev');
  assert.equal(summary.populationBefore, 90);
  assert.equal(summary.populationAfter, 120);
  assert.equal(summary.populationDelta, 30);
});

test('createNewCycleWithEffects consumes Deva faith when the new cycle changes month', async () => {
  const mock = createMockFirestore({
    'cycles/prev': { startedAt: '24 Alturiak 1490', createdAt: 'old' },
    'religions/psevdo/customs/Deva': { devaFaith: 70, devaFaithPerDay: 2, deathMarkers: 0 },
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  const result = await createNewCycleWithEffects(
    { startedDate: { day: 3, month: 2, year: 1490 }, islandId: 'island_rock' },
    {
      ...mock.firebase,
      db: mock.db,
      settlePreviousSpellRequestsFn: async () => {},
      generateSpellRequestsForCycleFn: async () => {},
    },
  );

  const deva = mock.get('religions/psevdo/customs/Deva');
  assert.equal(deva.devaFaith, 10);
  assert.equal(deva.lastConsumedCycleId, result.id);
});

test('createNewCycleWithEffects pays Coin Pig for the closed previous cycle', async () => {
  const mock = createMockFirestore({
    'cycles/prev': { startedAt: '1 Hammer 1490', populationAtStart: 90, createdAt: 'old' },
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': {
      name: 'Coin Pig',
      payouts: [{ mechanic: 'coinPig', participantHeroIds: ['hero-1'] }],
    },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 1, goods: {} },
    'treasury/meta': { balance: 0 },
  });

  await createNewCycleWithEffects(
    { startedDate: '4 Hammer 1490', islandId: 'island_rock', population: 120 },
    {
      ...mock.firebase,
      db: mock.db,
      rng: () => 0.5, // 3 cycle days × (1d4=3, minus 1) = 6
      getDocs: async (q) => {
        if (q.__colPath === 'cycles') {
          return {
            docs: [{ id: 'prev', data: () => mock.get('cycles/prev'), ref: { __path: 'cycles/prev', __type: 'doc', id: 'prev' } }],
            empty: false,
          };
        }
        return mock.firebase.getDocs(q);
      },
      settlePreviousSpellRequestsFn: async () => {},
      generateSpellRequestsForCycleFn: async () => {},
    },
  );

  assert.equal(mock.get('heroes/hero-1').goldBalance, 7);
  const txs = Object.values(mock.list('hero-transactions'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].cycleId, 'prev');
  assert.equal(txs[0].cycleStartedAt, '1 Hammer 1490');
  assert.equal(mock.get('cycles/prev').autoIncomeOperation.status, 'done');
  assert.equal(mock.get('cycles/prev').autoIncomeOperation.logCount, 1);
  assert.equal(txs[0].cycleFinishedAt, '3 Hammer 1490 рік після Потопу');
});

test('createNewCycleWithEffects throws on invalid date', async () => {
  const mock = createMockFirestore({});

  await assert.rejects(
    () => createNewCycleWithEffects({ startedDate: 'not-a-date' }, {
      ...mock.firebase,
      db: mock.db,
      settlePreviousSpellRequestsFn: async () => {},
      generateSpellRequestsForCycleFn: async () => {},
    }),
    /INVALID_START_DATE/,
  );
});

test('createNewCycleWithEffects writes cycle religionAction without adventure title', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await createNewCycleWithEffects(
    { startedDate: '1 Hammer 1490' },
    {
      ...mock.firebase,
      db: mock.db,
      settlePreviousSpellRequestsFn: async () => {},
      generateSpellRequestsForCycleFn: async () => {},
    },
  );

  const actions = Object.values(mock.list('religion-actions'));
  assert.equal(actions.length, 1);
  assert.equal(actions[0].notes, '');
  assert.equal(actions[0].convertedFollowers, 0);
});

test('buildExpeditionDetails calculates crew groups and distributes remainder cents', () => {
  const result = buildExpeditionDetails({
    adventureTitle: 'Штормова затока',
    durationDays: 5,
    participantHeroIds: ['h1', 'h2', 'h3'],
    crewGroups: [
      { role: 'Моряки', count: 9, dailyRate: 2 },
      { role: 'Капітан', count: 1, dailyRate: 10 },
    ],
  });

  assert.equal(result.totalCrewCount, 10);
  assert.equal(result.totalCost, 140);
  assert.deepEqual(result.participantShares.map((item) => item.amount), [46.67, 46.67, 46.66]);
});

test('createNewCycleWithEffects stores expedition, deducts negative balances, and writes crew logs', async () => {
  const mock = createMockFirestore({
    'cycles/prev': { startedAt: '1 Hammer 1490', populationAtStart: 90, createdAt: 1 },
    'heroes/h1': { name: 'Ада', goldBalance: 10 },
    'heroes/h2': { name: 'Бран', goldBalance: 5 },
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await createNewCycleWithEffects({
    startedDate: '8 Hammer 1490',
    islandId: 'island_rock',
    expedition: {
      adventureTitle: 'Глибини', durationDays: 5, participantHeroIds: ['h1', 'h2'],
      crewGroups: [{ role: 'Моряки', count: 4, dailyRate: 2 }], autoDeduct: true,
    },
  }, {
    ...mock.firebase, db: mock.db,
    settlePreviousSpellRequestsFn: async () => {}, generateSpellRequestsForCycleFn: async () => {},
  });

  assert.equal(mock.get('cycles/prev').expedition.totalCost, 40);
  assert.equal(mock.get('heroes/h1').goldBalance, -10);
  assert.equal(mock.get('heroes/h2').goldBalance, -15);
  const logs = Object.values(mock.list('hero-transactions'));
  assert.equal(logs.length, 2);
  assert.ok(logs.every((log) => log.type === 'crew-payment' && log.cycleId === 'prev'));
});

test('createNewCycleWithEffects stores expedition without financial changes when auto deduction is disabled', async () => {
  const mock = createMockFirestore({
    'cycles/prev': { startedAt: '1 Hammer 1490', createdAt: 1 },
    'heroes/h1': { name: 'Ада', goldBalance: 10 },
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });
  await createNewCycleWithEffects({
    startedDate: '8 Hammer 1490', islandId: 'island_rock',
    expedition: { adventureTitle: 'Тиша', durationDays: 1, participantHeroIds: ['h1'], crewGroups: [{ role: 'Моряки', count: 1, dailyRate: 2 }], autoDeduct: false },
  }, { ...mock.firebase, db: mock.db, settlePreviousSpellRequestsFn: async () => {}, generateSpellRequestsForCycleFn: async () => {} });

  assert.equal(mock.get('cycles/prev').expedition.autoDeduct, false);
  assert.equal(mock.get('heroes/h1').goldBalance, 10);
  assert.equal(Object.keys(mock.list('hero-transactions')).length, 0);
});

test('updateExpeditionDetails recalculates data, marks it edited, and creates no financial transactions', async () => {
  const mock = createMockFirestore({
    'cycles/c1': {
      startedAt: '1 Hammer 1490', finishedAt: '7 Hammer 1490',
      expedition: {
        adventureTitle: 'Глибини', durationDays: 5, participantHeroIds: ['h1'],
        participants: [{ heroId: 'h1', heroName: 'Ада' }],
        crewGroups: [{ role: 'Моряки', count: 2, dailyRate: 2 }],
        totalCrewCount: 2, totalCost: 20, autoDeduct: true, paymentStatus: 'deducted',
      },
    },
    'heroes/h1': { name: 'Ада', goldBalance: -10 },
    'heroes/h2': { name: 'Бран', goldBalance: 30 },
  });

  await updateExpeditionDetails('c1', {
    participantHeroIds: ['h1', 'h2'], durationDays: 3,
    crewGroups: [{ role: 'Моряки', count: 4, dailyRate: 2 }],
  }, { ...mock.firebase, db: mock.db });

  const expedition = mock.get('cycles/c1').expedition;
  assert.equal(expedition.totalCost, 24);
  assert.equal(expedition.totalCrewCount, 4);
  assert.equal(expedition.paymentStatus, 'edited');
  assert.deepEqual(expedition.participantShares.map((row) => row.amount), [12, 12]);
  assert.equal(mock.get('heroes/h1').goldBalance, -10);
  assert.equal(mock.get('heroes/h2').goldBalance, 30);
  assert.equal(Object.keys(mock.list('hero-transactions')).length, 0);
});

test('updateExpeditionDetails materializes a legacy expedition without financial transactions', async () => {
  const mock = createMockFirestore({
    'cycles/legacy': { startedAt: '1 Hammer 1490', finishedAt: '10 Hammer 1490' },
    'heroes/h1': { name: 'Ада', goldBalance: 50 },
  });

  await updateExpeditionDetails('legacy', {
    adventureTitle: 'Стара пригода', participantHeroIds: ['h1'], durationDays: 3,
    crewGroups: [{ role: 'Моряки', count: 2, dailyRate: 2 }],
  }, { ...mock.firebase, db: mock.db });

  const expedition = mock.get('cycles/legacy').expedition;
  assert.equal(expedition.adventureTitle, 'Стара пригода');
  assert.equal(expedition.totalCost, 12);
  assert.equal(expedition.autoDeduct, false);
  assert.equal(expedition.paymentStatus, 'edited');
  assert.equal(mock.get('heroes/h1').goldBalance, 50);
  assert.equal(Object.keys(mock.list('hero-transactions')).length, 0);
});

// ─── distributeManufactureIncome — hero destination ──────────────────────────

test('processBuildingYields fulfills yield events due on the new cycle start date', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': {
      buildings: {
        yield_garden: {
          name: 'Garden',
          yields: [
            {
              id: 'garden-12-kythorn',
              destination: 'hero:hero-1',
              date: '12 Kythorn 1490',
              goods: { vegetables: 12 },
              processed: false,
            },
          ],
        },
      },
    },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 0, goods: {} },
  });

  await processBuildingYields(
    'cycle-12-kythorn',
    { day: 12, month: 5, year: 1490 },
    'island_rock',
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('heroes/hero-1').goods.vegetables, 12);
  const txs = Object.values(mock.list('hero-transactions'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].type, 'building-yield');
  assert.deepEqual(txs[0].goods, { vegetables: 12 });
  assert.equal(mock.get('islands/island_rock')['buildings.yield_garden.yields'][0].processed, true);
});

test('processBuildingYields keeps future yield events pending', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': {
      buildings: {
        yield_garden: {
          name: 'Garden',
          yields: [
            {
              id: 'garden-13-kythorn',
              destination: 'hero:hero-1',
              date: '13 Kythorn 1490',
              goods: { vegetables: 12 },
              processed: false,
            },
          ],
        },
      },
    },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 0, goods: {} },
  });

  await processBuildingYields(
    'cycle-12-kythorn',
    { day: 12, month: 5, year: 1490 },
    'island_rock',
    { ...mock.firebase, db: mock.db },
  );

  assert.deepEqual(mock.get('heroes/hero-1').goods, {});
  assert.equal(Object.keys(mock.list('hero-transactions')).length, 0);
  assert.equal(mock.get('islands/island_rock')['buildings.yield_garden.yields'], undefined);
});

test('distributeManufactureIncome credits hero goldBalance from manufacture income', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': { name: 'Tavern', income: 5, incomeDestination: 'hero:hero-1', incomeGoods: {} },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 10, goods: {} },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('heroes/hero-1').goldBalance, 15);
  const txs = Object.values(mock.list('hero-transactions'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].goldAmount, 5);
  assert.equal(txs[0].type, 'income');
  assert.equal(txs[0].heroId, 'hero-1');
  assert.equal(mock.get('treasury/meta').balance, 0); // treasury unchanged
});

test('distributeManufactureIncome credits hero goods from manufacture incomeGoods', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': { name: 'Brewery', income: 0, incomeDestination: 'hero:hero-1', incomeGoods: { 'good-barrel': 2 } },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 0, goods: { 'good-barrel': 3 } },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('heroes/hero-1').goods['good-barrel'], 5);
  const txs = Object.values(mock.list('hero-transactions'));
  assert.equal(txs[0].goods['good-barrel'], 2);
});

test('distributeManufactureIncome deducts hero goldBalance for negative income (auto deduction)', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': { name: 'Debt', income: -3, incomeDestination: 'hero:hero-1', incomeGoods: {} },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 10, goods: {} },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('heroes/hero-1').goldBalance, 7);
  const txs = Object.values(mock.list('hero-transactions'));
  assert.equal(txs[0].goldAmount, -3);
  assert.equal(txs[0].type, 'deduction');
});

test('distributeManufactureIncome allows auto deductions to make hero balance negative', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': { name: 'Debt', income: -50, incomeDestination: 'hero:hero-1', incomeGoods: {} },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 10, goods: {} },
    'treasury/meta': { balance: 0 },
  });

  await distributeManufactureIncome(
    'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
    { ...mock.firebase, db: mock.db },
  );

  assert.equal(mock.get('heroes/hero-1').goldBalance, -40);
  const txs = Object.values(mock.list('hero-transactions'));
  assert.equal(txs.length, 1);
  assert.equal(txs[0].goldAmount, -50);
  assert.equal(txs[0].type, 'deduction');
});
