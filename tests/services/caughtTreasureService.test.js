import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getCaughtTreasureLookup,
  isCaughtTreasureOwnedByHero,
  removeCaughtTreasure,
} from '../../src/services/caughtTreasureService.js'
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

test('caught treasure lookup supports numeric ids and usernames', () => {
  assert.deepEqual(getCaughtTreasureLookup('42'), { field: 'telegramUserId', value: '42' })
  assert.deepEqual(getCaughtTreasureLookup('@PanShkarpetka'), { field: 'telegramUsernameKey', value: 'panshkarpetka' })
})

test('isCaughtTreasureOwnedByHero uses heroId before telegram fallback', () => {
  assert.equal(
    isCaughtTreasureOwnedByHero({ heroId: 'h1', telegramUserId: '42' }, { heroId: 'h2', telegramId: '42' }),
    false,
  )
  assert.equal(
    isCaughtTreasureOwnedByHero({ heroId: null, telegramUserId: '42' }, { heroId: 'h2', telegramId: '42' }),
    true,
  )
  assert.equal(
    isCaughtTreasureOwnedByHero(
      { heroId: null, telegramUsernameKey: 'panshkarpetka' },
      { heroId: 'h2', telegramId: '@PanShkarpetka' },
    ),
    true,
  )
})

test('removeCaughtTreasure marks treasure removed and does not change hero gold balance', async () => {
  const { mock, deps } = makeDeps({
    'heroes/h1': { name: 'Aela', telegramId: '42', goldBalance: 5 },
    'caught-treasures/t1': {
      treasureName: 'Diamond',
      valueGold: 237,
      telegramUserId: '42',
      heroId: 'h1',
      status: 'available',
    },
  })

  await removeCaughtTreasure(
    { heroId: 'h1', heroName: 'Aela', telegramId: '42', treasureId: 't1', actorName: 'Aela' },
    deps,
  )

  assert.equal(mock.get('heroes/h1').goldBalance, 5)
  assert.equal(mock.get('caught-treasures/t1').status, 'removed')
  const logs = Object.values(mock.list('hero-transactions'))
  assert.equal(logs.length, 1)
  assert.equal(logs[0].type, 'treasure-remove')
  assert.equal(logs[0].goldAmount, 0)
  assert.equal(logs[0].treasureValueGold, 237)
})

test('removeCaughtTreasure rejects another hero treasure unless admin', async () => {
  const { deps } = makeDeps({
    'caught-treasures/t1': {
      treasureName: 'Diamond',
      valueGold: 237,
      telegramUserId: '99',
      heroId: 'h2',
      status: 'available',
    },
  })

  await assert.rejects(
    () => removeCaughtTreasure({ heroId: 'h1', heroName: 'Aela', telegramId: '42', treasureId: 't1' }, deps),
    /іншому/,
  )
})
