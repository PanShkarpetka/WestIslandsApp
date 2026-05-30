import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resetReligionsSvTemp,
  loadManufacturesByIds,
  distributeManufactureIncome,
  distributeBuildingFaithIncome,
  createNewCycleWithEffects,
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
});

test('createNewCycleWithEffects closes open previous cycle', async () => {
  const mock = createMockFirestore({
    'cycles/prev': { startedAt: '1 Uktar 1489', createdAt: 'old' },
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await createNewCycleWithEffects(
    { startedDate: '1 Hammer 1490', islandId: 'island_rock' },
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

test('createNewCycleWithEffects writes religionAction doc', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: [] },
    'treasury/meta': { balance: 0 },
  });

  await createNewCycleWithEffects(
    { startedDate: '1 Hammer 1490', notes: 'Test cycle' },
    {
      ...mock.firebase,
      db: mock.db,
      settlePreviousSpellRequestsFn: async () => {},
      generateSpellRequestsForCycleFn: async () => {},
    },
  );

  const actions = Object.values(mock.list('religion-actions'));
  assert.equal(actions.length, 1);
  assert.equal(actions[0].notes, 'Test cycle');
  assert.equal(actions[0].convertedFollowers, 0);
});

// ─── distributeManufactureIncome — hero destination ──────────────────────────

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

test('distributeManufactureIncome throws when hero deduction would make balance negative', async () => {
  const mock = createMockFirestore({
    'islands/island_rock': { manufactures: ['m1'] },
    'manufactures/m1': { name: 'Debt', income: -50, incomeDestination: 'hero:hero-1', incomeGoods: {} },
    'heroes/hero-1': { name: 'Boromir', goldBalance: 10, goods: {} },
    'treasury/meta': { balance: 0 },
  });

  await assert.rejects(
    () => distributeManufactureIncome(
      'cycle-1', '1 Hammer 1490', null, 'island_rock', [],
      { ...mock.firebase, db: mock.db },
    ),
    /Недостатньо коштів/,
  );

  // hero balance must be unchanged after failed transaction
  assert.equal(mock.get('heroes/hero-1').goldBalance, 10);
});
