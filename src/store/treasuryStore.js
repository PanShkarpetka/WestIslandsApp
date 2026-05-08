import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getFirestore, doc, collection, query, orderBy, limit, startAfter,
  getDocs, onSnapshot, runTransaction, serverTimestamp,
} from 'firebase/firestore'
import { normalizeAmount } from '../utils/numbers.js'

// Exported for testing. Accepts injectable firebase deps so the transaction
// logic can be verified without a real Firestore connection.
export async function applyTreasuryTransaction(
  { delta, type, comment, user },
  {
    runTransactionFn = runTransaction,
    docFn = doc,
    collectionFn = collection,
    serverTimestampFn = serverTimestamp,
    db: firestoreDb,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  const metaRef = docFn(db, 'treasury/meta')
  const txCol = collectionFn(db, 'treasury-transactions')

  await runTransactionFn(db, async (t) => {
    const metaSnap = await t.get(metaRef)
    const metaData = metaSnap.exists() ? metaSnap.data() : {}
    const current = metaData.balance || 0
    const newBalance = current + delta

    if (newBalance < 0) throw new Error('Недостатньо золота у скарбниці.')

    const txRef = docFn(txCol)
    t.set(txRef, {
      amount: delta,
      type,
      comment: (comment || '').slice(0, 500),
      userId: user?.uid || 'anon',
      nickname: (user?.nickname || 'Гравець').slice(0, 80),
      createdAt: serverTimestampFn(),
      balanceAfter: newBalance,
    })
    t.set(metaRef, { balance: newBalance, updatedAt: serverTimestampFn() }, { merge: true })
  })
}

export const useTreasuryStore = defineStore('treasury', () => {
  const balance = ref(0)
  const totalIncome = ref(0)
  const totalOutcome = ref(0)
  const tx = ref([])
  const loading = ref(false)
  const error = ref(null)
  const _pageSize = 20
  let _lastDoc = null
  let _unsubMeta = null

  function subscribeBalance() {
    if (_unsubMeta) return
    const db = getFirestore()
    const metaRef = doc(db, 'treasury/meta')
    _unsubMeta = onSnapshot(metaRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        balance.value = data.balance || 0
        totalIncome.value = data.totalIncome || 0
        totalOutcome.value = data.totalOutcome || 0
      } else {
        balance.value = 0
        totalIncome.value = 0
        totalOutcome.value = 0
      }
    })
  }

  function unsubscribeBalance() {
    _unsubMeta?.()
    _unsubMeta = null
  }

  async function loadFirstPage() {
    loading.value = true
    error.value = null
    try {
      const db = getFirestore()
      const q = query(
        collection(db, 'treasury-transactions'),
        orderBy('createdAt', 'desc'),
        limit(_pageSize),
      )
      const snap = await getDocs(q)
      tx.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      _lastDoc = snap.docs[snap.docs.length - 1] || null
    } catch (e) {
      error.value = e?.message || String(e)
    } finally {
      loading.value = false
    }
  }

  async function loadNextPage() {
    if (!_lastDoc) return
    loading.value = true
    error.value = null
    try {
      const db = getFirestore()
      const q = query(
        collection(db, 'treasury-transactions'),
        orderBy('createdAt', 'desc'),
        startAfter(_lastDoc),
        limit(_pageSize),
      )
      const snap = await getDocs(q)
      tx.value.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      _lastDoc = snap.docs[snap.docs.length - 1] || null
    } catch (e) {
      error.value = e?.message || String(e)
    } finally {
      loading.value = false
    }
  }

  async function deposit({ amount, comment, user }) {
    const delta = normalizeAmount(amount)
    if (!delta || delta <= 0) throw new Error('Сума має бути більшою за 0.')
    await applyTreasuryTransaction({ delta, type: 'deposit', comment, user })
  }

  async function withdraw({ amount, comment, user }) {
    const deltaAbs = normalizeAmount(amount)
    if (!deltaAbs || deltaAbs <= 0) throw new Error('Сума має бути більшою за 0.')
    const delta = -deltaAbs
    await applyTreasuryTransaction({ delta, type: 'withdraw', comment, user })
  }

  return {
    balance,
    totalIncome,
    totalOutcome,
    tx,
    loading,
    error,
    subscribeBalance,
    unsubscribeBalance,
    loadFirstPage,
    loadNextPage,
    deposit,
    withdraw,
  }
})
