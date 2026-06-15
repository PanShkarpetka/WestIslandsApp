import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateSpellRequestPayout,
  fulfillSpellRequest,
} from '../../src/services/mageGuildService.js'
import { createMockFirestore } from '../helpers/mockFirestore.js'

function makeDeps(seed = {}) {
  const mock = createMockFirestore(seed)
  return {
    mock,
    deps: {
      db: mock.db,
      runTransactionFn: mock.firebase.runTransaction,
      docFn: mock.firebase.doc,
      collectionFn: mock.firebase.collection,
      serverTimestampFn: mock.firebase.serverTimestamp,
    },
  }
}

function seedRequest(overrides = {}) {
  return {
    localId: 'req-1',
    spellName: 'Teleport',
    spellLevel: '5',
    compensation: 100,
    downtimeDays: 3,
    fulfilled: false,
    ...overrides,
  }
}

test('calculateSpellRequestPayout splits gross between hero treasury and guild', () => {
  assert.deepEqual(calculateSpellRequestPayout(100, 0.1, 0.2), {
    gross: 100,
    heroNet: 70,
    treasuryTax: 10,
    treasuryTaxRate: 0.1,
    guildTax: 20,
    guildTaxRate: 0.2,
  })
})

test('fulfillSpellRequest writes fulfillment and financial transactions atomically', async () => {
  const { mock, deps } = makeDeps({
    'spell-requests/doc-1': { requests: [seedRequest()], cycleId: 'cycle-1' },
    'heroes/hero-1': { name: 'Aela', goldBalance: 5 },
    'treasury/meta': { balance: 100 },
    'guilds/mages': { name: 'Mage Guild', treasure: 50 },
    'islands/island_rock': { taxRate: 0.1 },
  })

  const result = await fulfillSpellRequest({
    spellRequestId: 'doc-1',
    requestId: 'req-1',
    heroId: 'hero-1',
    guildId: 'mages',
    mageGuildTaxRate: 0.2,
    islandId: 'island_rock',
    telegramPostUrl: ' https://t.me/post ',
    actorName: 'Admin',
  }, deps)

  assert.equal(result.heroNet, 70)
  assert.equal(result.treasuryTax, 10)
  assert.equal(result.guildTax, 20)
  assert.equal(mock.get('heroes/hero-1').goldBalance, 75)
  assert.equal(mock.get('treasury/meta').balance, 110)
  assert.equal(mock.get('guilds/mages').treasure, 70)

  const request = mock.get('spell-requests/doc-1').requests[0]
  assert.equal(request.fulfilled, true)
  assert.equal(request.fulfilledByHeroId, 'hero-1')
  assert.equal(request.fulfilledByHeroName, 'Aela')
  assert.equal(request.telegramPostUrl, 'https://t.me/post')
  assert.equal(request.grossReward, 100)
  assert.equal(request.heroNetReward, 70)
  assert.equal(request.treasuryTax, 10)
  assert.equal(request.treasuryTaxRate, 0.1)
  assert.equal(request.guildTax, 20)
  assert.equal(request.guildTaxRate, 0.2)
  assert.equal(request.mageGuildId, 'mages')
  assert.equal(request.mageGuildName, 'Mage Guild')

  const heroLogs = Object.values(mock.list('hero-transactions'))
  assert.equal(heroLogs.length, 1)
  assert.equal(heroLogs[0].type, 'mage-guild-reward')
  assert.equal(heroLogs[0].goldAmount, 70)

  const treasuryLogs = Object.values(mock.list('treasury-transactions'))
  assert.equal(treasuryLogs.length, 1)
  assert.equal(treasuryLogs[0].type, 'mage-guild-tax')
  assert.equal(treasuryLogs[0].amount, 10)
  assert.equal(treasuryLogs[0].balanceAfter, 110)

  const guildLogs = Object.values(mock.list('guilds/mages/logs'))
  assert.equal(guildLogs.length, 1)
  assert.equal(guildLogs[0].type, 'mage-guild-tax')
  assert.equal(guildLogs[0].amount, 20)
  assert.equal(guildLogs[0].treasureAfter, 70)
})

test('fulfillSpellRequest allows zero mage guild share', async () => {
  const { mock, deps } = makeDeps({
    'spell-requests/doc-1': { requests: [seedRequest()] },
    'heroes/hero-1': { name: 'Aela', goldBalance: 0 },
    'treasury/meta': { balance: 0 },
    'guilds/mages': { name: 'Mage Guild', treasure: 0 },
    'islands/island_rock': { taxRate: 0.1 },
  })

  await fulfillSpellRequest({
    spellRequestId: 'doc-1',
    requestId: 'req-1',
    heroId: 'hero-1',
    guildId: 'mages',
    mageGuildTaxRate: 0,
  }, deps)

  assert.equal(mock.get('heroes/hero-1').goldBalance, 90)
  assert.equal(mock.get('treasury/meta').balance, 10)
  assert.equal(mock.get('guilds/mages').treasure, 0)
})

test('fulfillSpellRequest uses custom island taxRate', async () => {
  const { mock, deps } = makeDeps({
    'spell-requests/doc-1': { requests: [seedRequest()] },
    'heroes/hero-1': { name: 'Aela', goldBalance: 0 },
    'treasury/meta': { balance: 0 },
    'guilds/mages': { name: 'Mage Guild', treasure: 0 },
    'islands/island_rock': { taxRate: 0.15 },
  })

  await fulfillSpellRequest({
    spellRequestId: 'doc-1',
    requestId: 'req-1',
    heroId: 'hero-1',
    guildId: 'mages',
    mageGuildTaxRate: 0.2,
  }, deps)

  assert.equal(mock.get('heroes/hero-1').goldBalance, 65)
  assert.equal(mock.get('treasury/meta').balance, 15)
  assert.equal(mock.get('guilds/mages').treasure, 20)
})

test('fulfillSpellRequest rejects repeated fulfillment without extra logs', async () => {
  const { mock, deps } = makeDeps({
    'spell-requests/doc-1': { requests: [seedRequest({ fulfilled: true })] },
    'heroes/hero-1': { name: 'Aela', goldBalance: 0 },
    'treasury/meta': { balance: 0 },
    'guilds/mages': { name: 'Mage Guild', treasure: 0 },
    'islands/island_rock': { taxRate: 0.1 },
  })

  await assert.rejects(
    () => fulfillSpellRequest({
      spellRequestId: 'doc-1',
      requestId: 'req-1',
      heroId: 'hero-1',
      guildId: 'mages',
      mageGuildTaxRate: 0.2,
    }, deps),
    /вже виконана/,
  )

  assert.equal(Object.keys(mock.list('hero-transactions')).length, 0)
  assert.equal(Object.keys(mock.list('treasury-transactions')).length, 0)
  assert.equal(Object.keys(mock.list('guilds/mages/logs')).length, 0)
})

test('fulfillSpellRequest rejects missing hero guild or island', async () => {
  await assert.rejects(
    () => fulfillSpellRequest({
      spellRequestId: 'doc-1',
      requestId: 'req-1',
      heroId: 'missing',
      guildId: 'mages',
    }, makeDeps({
      'spell-requests/doc-1': { requests: [seedRequest()] },
      'guilds/mages': { name: 'Mage Guild', treasure: 0 },
      'islands/island_rock': { taxRate: 0.1 },
    }).deps),
    /Героя не знайдено/,
  )

  await assert.rejects(
    () => fulfillSpellRequest({
      spellRequestId: 'doc-1',
      requestId: 'req-1',
      heroId: 'hero-1',
      guildId: 'missing',
    }, makeDeps({
      'spell-requests/doc-1': { requests: [seedRequest()] },
      'heroes/hero-1': { name: 'Aela', goldBalance: 0 },
      'islands/island_rock': { taxRate: 0.1 },
    }).deps),
    /Гільдію/,
  )

  await assert.rejects(
    () => fulfillSpellRequest({
      spellRequestId: 'doc-1',
      requestId: 'req-1',
      heroId: 'hero-1',
      guildId: 'mages',
    }, makeDeps({
      'spell-requests/doc-1': { requests: [seedRequest()] },
      'heroes/hero-1': { name: 'Aela', goldBalance: 0 },
      'guilds/mages': { name: 'Mage Guild', treasure: 0 },
    }).deps),
    /Острів/,
  )
})

test('fulfillSpellRequest rejects invalid tax rates', async () => {
  const seed = {
    'spell-requests/doc-1': { requests: [seedRequest()] },
    'heroes/hero-1': { name: 'Aela', goldBalance: 0 },
    'treasury/meta': { balance: 0 },
    'guilds/mages': { name: 'Mage Guild', treasure: 0 },
    'islands/island_rock': { taxRate: 0.1 },
  }

  await assert.rejects(
    () => fulfillSpellRequest({
      spellRequestId: 'doc-1',
      requestId: 'req-1',
      heroId: 'hero-1',
      guildId: 'mages',
      mageGuildTaxRate: -0.1,
    }, makeDeps(seed).deps),
    /non-negative/,
  )

  await assert.rejects(
    () => fulfillSpellRequest({
      spellRequestId: 'doc-1',
      requestId: 'req-1',
      heroId: 'hero-1',
      guildId: 'mages',
      mageGuildTaxRate: 0.95,
    }, makeDeps(seed).deps),
    /100%/,
  )
})
