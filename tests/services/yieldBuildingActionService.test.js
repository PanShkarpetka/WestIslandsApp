import test from 'node:test'
import assert from 'node:assert/strict'
import {
  useYieldBuildingAction,
  validateYieldBuildingActionConfig,
} from '../../src/services/yieldBuildingActionService.js'
import { createMockFirestore } from '../helpers/mockFirestore.js'

function makeDeps(seed = {}, overrides = {}) {
  const mock = createMockFirestore({
    'islands/island_rock': {
      buildings: {
        yield_orchard: {
          built: true,
          yieldBuildingId: 'orchard',
          ownerHeroId: 'hero-1',
        },
      },
    },
    'yield-buildings/orchard': {
      name: 'Orchard',
      incomeType: 'owner-action',
      actionCostGold: 3.5,
      maxUsesPerCycle: 2,
      actionVariants: [
        { id: 'apples', goodId: 'good-apples', amount: 4 },
        { id: 'pears', goodId: 'good-pears', amount: 2 },
      ],
    },
    'heroes/hero-1': { name: 'Aela', goldBalance: 10, goods: { 'good-apples': 1 } },
    'cycles/cycle-1': { startedAt: '1 Kythorn 1492' },
    'goods/good-apples': { name: 'Apples', unit: 'basket' },
    'goods/good-pears': { name: 'Pears', unit: 'basket' },
    ...seed,
  })
  return {
    mock,
    deps: {
      db: mock.db,
      runTransactionFn: mock.firebase.runTransaction,
      docFn: mock.firebase.doc,
      collectionFn: mock.firebase.collection,
      serverTimestampFn: mock.firebase.serverTimestamp,
      ...overrides,
    },
  }
}

const request = {
  islandId: 'island_rock',
  buildingKey: 'yield_orchard',
  heroId: 'hero-1',
  cycleId: 'cycle-1',
  variantId: 'apples',
}

test('owner action atomically deducts gold, credits selected goods, counts usage, and logs it', async () => {
  const { mock, deps } = makeDeps()
  const result = await useYieldBuildingAction(request, deps)

  assert.equal(mock.get('heroes/hero-1').goldBalance, 6.5)
  assert.equal(mock.get('heroes/hero-1').goods['good-apples'], 5)
  assert.deepEqual(
    mock.get('islands/island_rock').buildings.yield_orchard.actionUsage,
    { cycleId: 'cycle-1', count: 1 },
  )
  assert.equal(result.remainingUses, 1)

  const transactions = Object.values(mock.list('hero-transactions'))
  assert.equal(transactions.length, 1)
  assert.equal(transactions[0].type, 'building-action')
  assert.equal(transactions[0].goldAmount, -3.5)
  assert.deepEqual(transactions[0].goods, { 'good-apples': 4 })
})

test('owner action rejects a different hero', async () => {
  const { mock, deps } = makeDeps({ 'heroes/hero-2': { name: 'Borin', goldBalance: 20, goods: {} } })
  await assert.rejects(
    () => useYieldBuildingAction({ ...request, heroId: 'hero-2' }, deps),
    /лише власнику/,
  )
  assert.equal(mock.get('heroes/hero-2').goldBalance, 20)
})

test('owner action rejects insufficient gold without changing goods or usage', async () => {
  const { mock, deps } = makeDeps({ 'heroes/hero-1': { name: 'Aela', goldBalance: 3, goods: {} } })
  await assert.rejects(() => useYieldBuildingAction(request, deps), /Недостатньо золота/)
  assert.deepEqual(mock.get('heroes/hero-1').goods, {})
  assert.equal(mock.get('islands/island_rock').buildings.yield_orchard.actionUsage, undefined)
})

test('owner action enforces the per-cycle limit and resets for a new cycle id', async () => {
  const { mock, deps } = makeDeps({
    'islands/island_rock': {
      buildings: {
        yield_orchard: {
          built: true,
          yieldBuildingId: 'orchard',
          ownerHeroId: 'hero-1',
          actionUsage: { cycleId: 'cycle-1', count: 2 },
        },
      },
    },
    'cycles/cycle-2': { startedAt: '8 Kythorn 1492' },
  })

  await assert.rejects(() => useYieldBuildingAction(request, deps), /Ліміт використань/)
  await useYieldBuildingAction({ ...request, cycleId: 'cycle-2' }, deps)
  assert.deepEqual(
    mock.get('islands/island_rock').buildings.yield_orchard.actionUsage,
    { cycleId: 'cycle-2', count: 1 },
  )
})

test('owner action requires the configured good to still exist', async () => {
  const { mock, deps } = makeDeps()
  mock.store.delete('goods/good-apples')
  await assert.rejects(() => useYieldBuildingAction(request, deps), /товар не існує/)
})

test('guild owner action deducts guild treasure, credits guild goods, and writes a guild log', async () => {
  const { mock, deps } = makeDeps({
    'islands/island_rock': {
      buildings: {
        yield_orchard: {
          built: true,
          yieldBuildingId: 'orchard',
          ownerType: 'guild',
          ownerId: 'guild-a',
          ownerGuildId: 'guild-a',
        },
      },
    },
    'guilds/guild-a': { name: 'Sailors', leader: 'Captain', treasure: 12, goods: { 'good-apples': 2 } },
  })

  const result = await useYieldBuildingAction({
    ...request,
    heroId: '',
    leaderGuildIds: ['guild-a'],
    actorName: 'Captain',
  }, deps)

  assert.equal(result.ownerType, 'guild')
  assert.equal(result.guildId, 'guild-a')
  assert.equal(mock.get('guilds/guild-a').treasure, 8.5)
  assert.equal(mock.get('guilds/guild-a').goods['good-apples'], 6)
  const logs = Object.values(mock.list('guilds/guild-a/logs'))
  assert.equal(logs.length, 1)
  assert.equal(logs[0].type, 'building-action')
  assert.equal(logs[0].amount, -3.5)
  assert.deepEqual(logs[0].goods, { 'good-apples': 4 })
  assert.equal(logs[0].userNickname, 'Captain')
})

test('guild owner action rejects a user who is not that guild leader', async () => {
  const { mock, deps } = makeDeps({
    'islands/island_rock': {
      buildings: {
        yield_orchard: {
          built: true,
          yieldBuildingId: 'orchard',
          ownerType: 'guild',
          ownerId: 'guild-a',
        },
      },
    },
    'guilds/guild-a': { name: 'Sailors', treasure: 12, goods: {} },
  })

  await assert.rejects(
    () => useYieldBuildingAction({ ...request, heroId: '', leaderGuildIds: ['guild-b'] }, deps),
    /лише лідеру гільдії-власника/,
  )
  assert.equal(mock.get('guilds/guild-a').treasure, 12)
  assert.deepEqual(mock.list('guilds/guild-a/logs'), {})
})

test('guild owner action rejects insufficient guild treasure', async () => {
  const { mock, deps } = makeDeps({
    'islands/island_rock': {
      buildings: {
        yield_orchard: {
          built: true,
          yieldBuildingId: 'orchard',
          ownerType: 'guild',
          ownerId: 'guild-a',
        },
      },
    },
    'guilds/guild-a': { name: 'Sailors', treasure: 3, goods: {} },
  })

  await assert.rejects(
    () => useYieldBuildingAction({ ...request, heroId: '', leaderGuildIds: ['guild-a'] }, deps),
    /балансі гільдії/,
  )
  assert.equal(mock.get('guilds/guild-a').treasure, 3)
  assert.deepEqual(mock.get('guilds/guild-a').goods, {})
})

test('action config requires positive whole goods quantities and at least one use', () => {
  assert.throws(
    () => validateYieldBuildingActionConfig({ actionCostGold: 0, maxUsesPerCycle: 1, actionVariants: [{ id: 'one', goodId: 'good', amount: 1 }] }),
    /більшою за 0/,
  )
  assert.throws(
    () => validateYieldBuildingActionConfig({ actionCostGold: 1, maxUsesPerCycle: 0, actionVariants: [] }),
    /не меншою за 1/,
  )
  assert.throws(
    () => validateYieldBuildingActionConfig({
      actionCostGold: 1,
      maxUsesPerCycle: 1,
      actionVariants: [{ id: 'bad', goodId: 'good', amount: 0 }],
    }),
    /додатну кількість/,
  )
})
