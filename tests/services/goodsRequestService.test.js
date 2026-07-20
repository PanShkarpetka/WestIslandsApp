import test from 'node:test'
import assert from 'node:assert/strict'
import { approveGoodsRequest, rejectGoodsRequest, submitGoodsDepositRequest } from '../../src/services/goodsRequestService.js'
import { createMockFirestore } from '../helpers/mockFirestore.js'

function makeDeps(seed = {}) {
  const mock = createMockFirestore(seed)
  return {
    mock,
    deps: {
      db: mock.db,
      addDocFn: mock.firebase.addDoc,
      collectionFn: mock.firebase.collection,
      docFn: mock.firebase.doc,
      getDocFn: mock.firebase.getDoc,
      runTransactionFn: mock.firebase.runTransaction,
      serverTimestampFn: mock.firebase.serverTimestamp,
    },
  }
}

test('player goods request does not change a guild balance before approval', async () => {
  const { mock, deps } = makeDeps({
    'guilds/guild-1': { name: 'Sailors', treasure: 10, goods: { timber: 2 } },
    'goods/timber': { name: 'Timber', unit: 'шт.' },
  })
  await submitGoodsDepositRequest({ targetType: 'guild', targetId: 'guild-1', goods: { timber: 3 }, createdBy: 'Aela' }, deps)
  assert.deepEqual(mock.get('guilds/guild-1').goods, { timber: 2 })
  const request = Object.values(mock.list('goods-requests'))[0]
  assert.equal(request.status, 'pending')
  assert.deepEqual(request.goods, { timber: 3 })
})

test('approving a hero goods request credits goods and writes an audit transaction', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero-1': { name: 'Aela', goods: { timber: 2 } },
    'goods-requests/request-1': { targetType: 'hero', targetId: 'hero-1', targetName: 'Aela', goods: { timber: 3 }, status: 'pending', comment: 'Crafted' },
  })
  await approveGoodsRequest({ requestId: 'request-1', reviewedBy: 'Admin' }, deps)
  assert.deepEqual(mock.get('heroes/hero-1').goods, { timber: 5 })
  assert.equal(mock.get('goods-requests/request-1').status, 'approved')
  const log = Object.values(mock.list('hero-transactions'))[0]
  assert.equal(log.type, 'goods-request-deposit')
  assert.equal(log.requestId, 'request-1')
})

test('approving a guild goods request credits goods and writes a guild log', async () => {
  const { mock, deps } = makeDeps({
    'guilds/guild-1': { name: 'Sailors', treasure: 10, goods: {} },
    'goods-requests/request-1': { targetType: 'guild', targetId: 'guild-1', targetName: 'Sailors', goods: { timber: 3 }, status: 'pending', createdBy: 'Aela' },
  })
  await approveGoodsRequest({ requestId: 'request-1', reviewedBy: 'Admin' }, deps)
  assert.deepEqual(mock.get('guilds/guild-1').goods, { timber: 3 })
  const log = Object.values(mock.list('guilds/guild-1/logs'))[0]
  assert.equal(log.type, 'goods-deposit')
  assert.equal(log.approvedFromRequestId, 'request-1')
})

test('rejecting a goods request leaves the target unchanged', async () => {
  const { mock, deps } = makeDeps({
    'heroes/hero-1': { name: 'Aela', goods: {} },
    'goods-requests/request-1': { targetType: 'hero', targetId: 'hero-1', goods: { timber: 3 }, status: 'pending' },
  })
  await rejectGoodsRequest({ requestId: 'request-1', reviewedBy: 'Admin' }, deps)
  assert.deepEqual(mock.get('heroes/hero-1').goods, {})
  assert.equal(mock.get('goods-requests/request-1').status, 'rejected')
})
