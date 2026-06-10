import test from 'node:test'
import assert from 'node:assert/strict'
import { adjustHeroGoldBalance, SNAPSHOT_HISTORY_DEFAULT_OPEN } from '../../src/services/heroBalanceService.js'
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

test('snapshot history starts collapsed', () => {
  assert.equal(SNAPSHOT_HISTORY_DEFAULT_OPEN, false)
})

test('adjustHeroGoldBalance updates goldBalance and writes delta transaction', async () => {
  const { mock, deps } = makeDeps({
    'heroes/h1': { name: 'Aela', goldBalance: 10 },
  })

  const result = await adjustHeroGoldBalance(
    { heroId: 'h1', newBalance: 15.25, comment: 'Manual correction', actor: { nickname: 'Admin' } },
    deps,
  )

  assert.equal(result.delta, 5.25)
  assert.equal(mock.get('heroes/h1').goldBalance, 15.25)
  const logs = Object.values(mock.list('hero-transactions'))
  assert.equal(logs.length, 1)
  assert.equal(logs[0].type, 'admin-balance-adjustment')
  assert.equal(logs[0].goldAmount, 5.25)
  assert.equal(logs[0].comment, 'Manual correction')
  assert.equal(logs[0].actorName, 'Admin')
})

test('adjustHeroGoldBalance rejects negative balances', async () => {
  const { deps } = makeDeps({
    'heroes/h1': { name: 'Aela', goldBalance: 10 },
  })

  await assert.rejects(
    () => adjustHeroGoldBalance({ heroId: 'h1', newBalance: -1 }, deps),
    /невід/,
  )
})
