import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateFishSaleTotals,
  getCaughtFishAccountState,
  getCaughtFishLookup,
  isCaughtFishOwnedByHero,
  releaseCaughtFish,
  sellCaughtFish,
} from '../../src/services/caughtFishService.js'
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

test('account fish state reports missing telegramId', () => {
  const state = getCaughtFishAccountState({ telegramId: '' })
  assert.equal(state.canLoadFish, false)
  assert.match(state.error, /Telegram ID/)
})

test('calculateFishSaleTotals aggregates gross tax and net', () => {
  const totals = calculateFishSaleTotals([{ valueGold: 10 }, { valueGold: 2.55 }], 0.1)
  assert.deepEqual(totals, { gross: 12.55, tax: 1.26, net: 11.29, taxRate: 0.1 })
})

test('caught fish lookup supports numeric ids and usernames', () => {
  assert.deepEqual(getCaughtFishLookup('42'), { field: 'telegramUserId', value: '42' })
  assert.deepEqual(getCaughtFishLookup('@PanShkarpetka'), { field: 'telegramUsernameKey', value: 'panshkarpetka' })
})

test('isCaughtFishOwnedByHero uses telegramId only for unassigned fish', () => {
  assert.equal(
    isCaughtFishOwnedByHero({ heroId: 'h1', telegramUserId: '42' }, { heroId: 'h2', telegramId: '42' }),
    false,
  )
  assert.equal(
    isCaughtFishOwnedByHero({ heroId: null, telegramUserId: '42' }, { heroId: 'h2', telegramId: '42' }),
    true,
  )
  assert.equal(
    isCaughtFishOwnedByHero(
      { heroId: null, telegramUserId: '99', telegramUsername: 'PanShkarpetka' },
      { heroId: 'h2', telegramId: '@panshkarpetka' },
    ),
    true,
  )
})

test('sellCaughtFish sells one fish and writes hero and treasury logs', async () => {
  const { mock, deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 5 },
    'treasury/meta': { balance: 100 },
    'islands/island_rock': { fishSaleTaxRate: 0.1 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '42', heroId: 'h1', status: 'available', valueGold: 10 },
  })

  const result = await sellCaughtFish(
    { heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1'], actorName: 'Aela' },
    deps,
  )

  assert.equal(result.gross, 10)
  assert.equal(result.tax, 1)
  assert.equal(result.net, 9)
  assert.equal(mock.get('heroes/h1').goldBalance, 14)
  assert.equal(mock.get('treasury/meta').balance, 101)
  assert.equal(mock.get('caught-fish/f1').status, 'sold')

  const heroLogs = Object.values(mock.list('hero-transactions'))
  assert.equal(heroLogs.length, 1)
  assert.equal(heroLogs[0].type, 'fish-sale')
  assert.equal(heroLogs[0].goldAmount, 9)

  const treasuryLogs = Object.values(mock.list('treasury-transactions'))
  assert.equal(treasuryLogs.length, 1)
  assert.equal(treasuryLogs[0].type, 'fish-tax')
  assert.equal(treasuryLogs[0].amount, 1)
  assert.equal(treasuryLogs[0].balanceAfter, 101)
})

test('sellCaughtFish sells multiple fish and uses custom island tax rate', async () => {
  const { mock, deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 0 },
    'treasury/meta': { balance: 0 },
    'islands/island_rock': { fishSaleTaxRate: 0.2 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '42', heroId: 'h1', status: 'available', valueGold: 10 },
    'caught-fish/f2': { fishName: 'Tuna', telegramUserId: '42', heroId: 'h1', status: 'available', valueGold: 5 },
  })

  const result = await sellCaughtFish(
    { heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1', 'f2'] },
    deps,
  )

  assert.equal(result.gross, 15)
  assert.equal(result.tax, 3)
  assert.equal(result.net, 12)
  assert.equal(mock.get('heroes/h1').goldBalance, 12)
  assert.equal(mock.get('treasury/meta').balance, 3)
  assert.equal(mock.get('caught-fish/f1').status, 'sold')
  assert.equal(mock.get('caught-fish/f2').status, 'sold')
})

test('sellCaughtFish falls back to default 10 percent tax and stores it on island', async () => {
  const { mock, deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 0 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '42', heroId: 'h1', status: 'available', valueGold: 10 },
  })

  await sellCaughtFish(
    { heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1'] },
    deps,
  )

  assert.equal(mock.get('heroes/h1').goldBalance, 9)
  assert.equal(mock.get('treasury/meta').balance, 1)
  assert.equal(mock.get('islands/island_rock').fishSaleTaxRate, 0.1)
})

test('releaseCaughtFish marks fish released without changing balances', async () => {
  const { mock, deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 5 },
    'treasury/meta': { balance: 100 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '42', heroId: 'h1', status: 'available', valueGold: 10 },
  })

  await releaseCaughtFish(
    { heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1'] },
    deps,
  )

  assert.equal(mock.get('heroes/h1').goldBalance, 5)
  assert.equal(mock.get('treasury/meta').balance, 100)
  assert.equal(mock.get('caught-fish/f1').status, 'released')
  const heroLogs = Object.values(mock.list('hero-transactions'))
  assert.equal(heroLogs[0].type, 'fish-release')
  assert.equal(heroLogs[0].goldAmount, 0)
})

test('sellCaughtFish rejects fish owned by another player', async () => {
  const { deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 0 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '99', heroId: 'h2', status: 'available', valueGold: 10 },
  })

  await assert.rejects(
    () => sellCaughtFish({ heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1'] }, deps),
    /іншому/,
  )
})

test('sellCaughtFish rejects reassigned telegramId when fish already has another heroId', async () => {
  const { deps } = makeDeps({
    'heroes/h2': { name: 'Borin', telegramId: '42', goldBalance: 0 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '42', heroId: 'h1', status: 'available', valueGold: 10 },
  })

  await assert.rejects(
    () => sellCaughtFish({ heroId: 'h2', heroName: 'Borin', telegramId: '42', caughtFishIds: ['f1'] }, deps),
    /іншому/,
  )
})

test('sellCaughtFish rejects missing and already processed fish', async () => {
  const { deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 0 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '42', heroId: 'h1', status: 'sold', valueGold: 10 },
  })

  await assert.rejects(
    () => sellCaughtFish({ heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['missing'] }, deps),
    /не знайдено/,
  )
  await assert.rejects(
    () => sellCaughtFish({ heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1'] }, deps),
    /вже оброблено/,
  )
})

test('sellCaughtFish rejects repeated sale after first transaction', async () => {
  const { mock, deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 0 },
    'caught-fish/f1': { fishName: 'Cod', telegramUserId: '42', heroId: 'h1', status: 'available', valueGold: 10 },
  })

  await sellCaughtFish({ heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1'] }, deps)
  await assert.rejects(
    () => sellCaughtFish({ heroId: 'h1', heroName: 'Aela', telegramId: '42', caughtFishIds: ['f1'] }, deps),
    /вже оброблено/,
  )
  assert.equal(Object.values(mock.list('hero-transactions')).length, 1)
})
