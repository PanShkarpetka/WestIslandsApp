import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveCraftingRequest,
  loadHeroesForCrafting,
  registerCraftAction,
  rejectCraftingRequest,
  submitCraftingRequest,
} from '../../src/services/craftingService.ts';
import { createMockFirestore } from '../helpers/mockFirestore.js';

const SWORD_ITEM = {
  slug: 'longsword',
  name: 'Longsword',
  category: 'Weapons',
  subcategory: 'Swords',
  categoryKey: 'weapons',
  subcategoryKey: 'weapons_swords',
  componentPrice: 15,
  weight: 3,
  craftDays: 2,
  dc: 12,
  isActive: true,
};

const DAGGER_ITEM = {
  slug: 'dagger',
  name: 'Dagger',
  category: 'Weapons',
  subcategory: 'Swords',
  categoryKey: 'weapons',
  subcategoryKey: 'weapons_swords',
  componentPrice: 5,
  weight: 0.5,
  craftDays: 1,
  dc: 8,
  isActive: true,
};

function makeDeps(seed = {}) {
  const mock = createMockFirestore(seed);
  return {
    mock,
    deps: {
      db: mock.db,
      addDoc: mock.firebase.addDoc,
      doc: mock.firebase.doc,
      collection: mock.firebase.collection,
      getDoc: mock.firebase.getDoc,
      getDocs: mock.firebase.getDocs,
      query: mock.firebase.query,
      where: mock.firebase.where,
      orderBy: mock.firebase.orderBy,
      limit: mock.firebase.limit,
      runTransaction: mock.firebase.runTransaction,
      serverTimestamp: mock.firebase.serverTimestamp,
    },
  };
}

test('registerCraftAction updates hero crafting progress and writes a log entry', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  const result = await registerCraftAction(
    { heroId: 'hero1', itemSlug: 'longsword', amountCrafted: 3, craftItems: [SWORD_ITEM], createdBy: 'player1' },
    deps,
  );

  assert.ok(result.crafting, 'should return updated crafting state');
  assert.equal(result.heroId, 'hero1');
  assert.equal(result.amountCrafted, 3);

  const heroData = mock.get('heroes/hero1');
  assert.ok(heroData.crafting, 'hero crafting field should be updated');
  assert.ok(heroData.crafting.itemProgress?.longsword, 'item progress should be recorded');

  const logs = Object.values(mock.list('heroes/hero1/crafting-logs'));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].itemSlug, 'longsword');
  assert.equal(logs[0].itemName, 'Longsword');
  assert.equal(logs[0].amountCrafted, 3);
  assert.equal(logs[0].componentPriceAtTime, 15);
  assert.equal(logs[0].totalComponentPriceAtTime, 45);
  assert.equal(logs[0].createdBy, 'player1');
});

test('loadHeroesForCrafting returns only active heroes', async () => {
  const { deps } = makeDeps({
    'heroes/active': { name: 'Aela', inactive: false, crafting: { itemProgress: {} } },
    'heroes/missingFlag': { name: 'Borin' },
    'heroes/inactive': { name: 'Cirdan', inactive: true },
  });

  const heroes = await loadHeroesForCrafting(deps);

  assert.deepEqual(
    heroes.map((hero) => hero.id),
    ['active', 'missingFlag'],
  );
  assert.equal(heroes.some((hero) => hero.id === 'inactive'), false);
});

test('submitCraftingRequest creates pending request without updating hero progress', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  await submitCraftingRequest(
    { heroId: 'hero1', heroName: 'Gandalf', itemSlug: 'longsword', amountCrafted: 2, craftDaysSpent: 4, craftItems: [SWORD_ITEM], createdBy: 'Gandalf' },
    deps,
  );

  const requests = Object.values(mock.list('crafting-requests'));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].status, 'pending');
  assert.equal(requests[0].heroName, 'Gandalf');
  assert.equal(requests[0].itemSlug, 'longsword');
  assert.equal(requests[0].amountCrafted, 2);
  assert.equal(requests[0].craftDaysSpent, 4);
  assert.equal(mock.get('heroes/hero1').crafting, null);
  assert.equal(Object.values(mock.list('heroes/hero1/crafting-logs')).length, 0);
});

test('submitCraftingRequest uses canonical hero name instead of client-provided name', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  await submitCraftingRequest(
    { heroId: 'hero1', heroName: 'Spoofed Name', itemSlug: 'longsword', amountCrafted: 1, craftDaysSpent: 1, craftItems: [SWORD_ITEM], createdBy: 'Gandalf' },
    deps,
  );

  const requests = Object.values(mock.list('crafting-requests'));
  assert.equal(requests[0].heroName, 'Gandalf');
});

test('submitCraftingRequest rejects missing or inactive heroes', async () => {
  const { deps } = makeDeps({
    'heroes/inactive': { name: 'Retired', inactive: true, crafting: null },
  });

  await assert.rejects(
    () => submitCraftingRequest(
      { heroId: 'missing', itemSlug: 'longsword', amountCrafted: 1, craftDaysSpent: 1, craftItems: [SWORD_ITEM], createdBy: 'Gandalf' },
      deps,
    ),
    /Hero not found/,
  );

  await assert.rejects(
    () => submitCraftingRequest(
      { heroId: 'inactive', itemSlug: 'longsword', amountCrafted: 1, craftDaysSpent: 1, craftItems: [SWORD_ITEM], createdBy: 'Retired' },
      deps,
    ),
    /Hero is inactive/,
  );
});

test('submitCraftingRequest rejects non-positive days spent', async () => {
  const { deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  await assert.rejects(
    () => submitCraftingRequest(
      { heroId: 'hero1', heroName: 'Gandalf', itemSlug: 'longsword', amountCrafted: 2, craftDaysSpent: 0, craftItems: [SWORD_ITEM], createdBy: 'Gandalf' },
      deps,
    ),
    /Craft days spent must be greater than 0/,
  );
});

test('approveCraftingRequest updates hero crafting and marks request approved', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
    'crafting-requests/request1': {
      heroId: 'hero1',
      heroName: 'Gandalf',
      itemSlug: 'longsword',
      itemName: 'Longsword',
      amountCrafted: 2,
      craftDaysSpent: 4,
      status: 'pending',
      createdBy: 'Gandalf',
    },
  });

  const result = await approveCraftingRequest(
    { requestId: 'request1', craftItems: [SWORD_ITEM], reviewedBy: 'Admin' },
    deps,
  );

  assert.equal(result.heroId, 'hero1');
  assert.equal(result.amountCrafted, 2);
  assert.equal(result.craftDaysSpent, 4);

  const request = mock.get('crafting-requests/request1');
  assert.equal(request.status, 'approved');
  assert.equal(request.reviewedBy, 'Admin');
  assert.ok(request.approvedLogId);

  const heroData = mock.get('heroes/hero1');
  assert.ok(heroData.crafting.itemProgress.longsword);

  const logs = Object.values(mock.list('heroes/hero1/crafting-logs'));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].approvedFromRequestId, 'request1');
  assert.equal(logs[0].craftDaysSpent, 4);
});

test('rejectCraftingRequest refuses already reviewed requests', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
    'crafting-requests/request1': {
      heroId: 'hero1',
      heroName: 'Gandalf',
      itemSlug: 'longsword',
      itemName: 'Longsword',
      amountCrafted: 2,
      craftDaysSpent: 4,
      status: 'approved',
      createdBy: 'Gandalf',
      approvedLogId: 'log1',
    },
  });

  await assert.rejects(
    () => rejectCraftingRequest({ requestId: 'request1', reviewedBy: 'Admin' }, deps),
    /Crafting request is already reviewed/,
  );

  assert.equal(mock.get('crafting-requests/request1').status, 'approved');
  assert.equal(mock.get('crafting-requests/request1').approvedLogId, 'log1');
});

test('rejectCraftingRequest marks pending request rejected', async () => {
  const { mock, deps } = makeDeps({
    'crafting-requests/request1': {
      heroId: 'hero1',
      heroName: 'Gandalf',
      itemSlug: 'longsword',
      itemName: 'Longsword',
      amountCrafted: 2,
      craftDaysSpent: 4,
      status: 'pending',
      createdBy: 'Gandalf',
    },
  });

  await rejectCraftingRequest({ requestId: 'request1', reviewedBy: 'Admin' }, deps);

  const request = mock.get('crafting-requests/request1');
  assert.equal(request.status, 'rejected');
  assert.equal(request.reviewedBy, 'Admin');
});

test('registerCraftAction links log to current active cycle', async () => {
  const { mock, deps } = makeDeps({
    'cycles/finished': { startedAt: '1 Hammer 1490', finishedAt: '10 Hammer 1490', createdAt: 1 },
    'cycles/current': { startedAt: '11 Hammer 1490', createdAt: 2 },
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  await registerCraftAction(
    { heroId: 'hero1', itemSlug: 'longsword', amountCrafted: 1, craftItems: [SWORD_ITEM] },
    deps,
  );

  const logs = Object.values(mock.list('heroes/hero1/crafting-logs'));
  assert.equal(logs[0].cycleId, 'current');
  assert.equal(logs[0].cycleStartedAt, '11 Hammer 1490');
  assert.equal(logs[0].heroId, 'hero1');
  assert.equal(logs[0].heroName, 'Gandalf');

  const cycleLogs = Object.values(mock.list('cycle-crafting-logs'));
  assert.equal(cycleLogs.length, 1);
  assert.equal(cycleLogs[0].cycleId, 'current');
  assert.equal(cycleLogs[0].sourcePath.includes('heroes/hero1/crafting-logs'), true);
});

test('registerCraftAction accumulates progress across multiple craft actions', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  await registerCraftAction(
    { heroId: 'hero1', itemSlug: 'longsword', amountCrafted: 2, craftItems: [SWORD_ITEM] },
    deps,
  );
  await registerCraftAction(
    { heroId: 'hero1', itemSlug: 'longsword', amountCrafted: 3, craftItems: [SWORD_ITEM] },
    deps,
  );

  const logs = Object.values(mock.list('heroes/hero1/crafting-logs'));
  assert.equal(logs.length, 2);

  const heroData = mock.get('heroes/hero1');
  const totalCraftActions = heroData.crafting?.summary?.totalCraftActions;
  assert.equal(totalCraftActions, 2);
});

test('registerCraftAction logs before/after progress values', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  await registerCraftAction(
    { heroId: 'hero1', itemSlug: 'longsword', amountCrafted: 1, craftItems: [SWORD_ITEM] },
    deps,
  );

  const logs = Object.values(mock.list('heroes/hero1/crafting-logs'));
  const log = logs[0];
  assert.equal(log.categoryBefore, 0);
  assert.ok(log.categoryAfter >= 0, 'categoryAfter should be set');
  assert.equal(typeof log.categoryCappedReached, 'boolean');
});

test('registerCraftAction throws when hero does not exist', async () => {
  const { deps } = makeDeps({});

  await assert.rejects(
    () => registerCraftAction(
      { heroId: 'nonexistent', itemSlug: 'longsword', amountCrafted: 1, craftItems: [SWORD_ITEM] },
      deps,
    ),
    /Hero not found/,
  );
});

test('registerCraftAction throws when item slug is not in craftItems', async () => {
  const { deps } = makeDeps({ 'heroes/hero1': { name: 'Gandalf', crafting: null } });

  await assert.rejects(
    () => registerCraftAction(
      { heroId: 'hero1', itemSlug: 'nonexistent-item', amountCrafted: 1, craftItems: [SWORD_ITEM] },
      deps,
    ),
    /Craft item not found/,
  );
});

test('registerCraftAction tracks different items independently', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero1': { name: 'Gandalf', crafting: null },
  });

  await registerCraftAction(
    { heroId: 'hero1', itemSlug: 'longsword', amountCrafted: 1, craftItems: [SWORD_ITEM, DAGGER_ITEM] },
    deps,
  );
  await registerCraftAction(
    { heroId: 'hero1', itemSlug: 'dagger', amountCrafted: 2, craftItems: [SWORD_ITEM, DAGGER_ITEM] },
    deps,
  );

  const heroData = mock.get('heroes/hero1');
  assert.ok(heroData.crafting.itemProgress.longsword, 'longsword progress should exist');
  assert.ok(heroData.crafting.itemProgress.dagger, 'dagger progress should exist');
});
