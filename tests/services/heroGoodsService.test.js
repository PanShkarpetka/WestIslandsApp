import test from 'node:test'
import assert from 'node:assert/strict'
import { adjustHeroGoods } from '../../src/services/heroGoodsService.js'
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

test('adjustHeroGoods updates hero goods and writes transaction log', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero-1': { name: 'Aela', goods: { timber: 2 } },
    'goods/timber': { name: 'Timber', unit: 'шт.' },
  })

  const result = await adjustHeroGoods({
    heroId: 'hero-1',
    goodId: 'timber',
    delta: 3,
    actor: { nickname: 'Admin' },
  }, deps)

  assert.equal(result.previousQty, 2)
  assert.equal(result.newQty, 5)
  assert.deepEqual(mock.get('heroes/hero-1').goods, { timber: 5 })

  const logs = Object.values(mock.list('hero-transactions'))
  assert.equal(logs.length, 1)
  assert.equal(logs[0].type, 'admin-goods-adjustment')
  assert.deepEqual(logs[0].goods, { timber: 3 })
})

test('adjustHeroGoods rejects negative final quantities', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero-1': { name: 'Aela', goods: { timber: 2 } },
    'goods/timber': { name: 'Timber', unit: 'шт.' },
  })

  await assert.rejects(
    () => adjustHeroGoods({ heroId: 'hero-1', goodId: 'timber', delta: -3 }, deps),
    /Недостатньо/,
  )
  assert.deepEqual(mock.get('heroes/hero-1').goods, { timber: 2 })
  assert.equal(Object.keys(mock.list('hero-transactions')).length, 0)
})
