import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'

function normalizeGoods(goods) {
  const normalized = {}
  for (const [goodId, rawAmount] of Object.entries(goods || {})) {
    const amount = Math.trunc(Number(rawAmount || 0))
    if (goodId && amount > 0) normalized[goodId] = (normalized[goodId] || 0) + amount
  }
  return normalized
}

function normalizeRequest(data, id) {
  return {
    id,
    ...(data || {}),
    goods: normalizeGoods(data?.goods),
    status: data?.status || 'pending',
  }
}

export async function submitGoodsDepositRequest(
  { targetType, targetId, goods, comment = '', createdBy = null },
  {
    db: firestoreDb,
    addDocFn = addDoc,
    collectionFn = collection,
    docFn = doc,
    getDocFn = getDoc,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  const normalizedGoods = normalizeGoods(goods)
  if (targetType !== 'hero' && targetType !== 'guild') throw new Error('Невідомий тип рахунку.')
  if (!targetId) throw new Error('Не вдалося визначити рахунок.')
  if (!Object.keys(normalizedGoods).length) throw new Error('Додайте хоча б один товар із кількістю.')

  const targetCollection = targetType === 'hero' ? 'heroes' : 'guilds'
  const targetSnap = await getDocFn(docFn(db, targetCollection, targetId))
  if (!targetSnap.exists()) throw new Error(targetType === 'hero' ? 'Героя не знайдено.' : 'Гільдію не знайдено.')

  const goodEntries = await Promise.all(Object.keys(normalizedGoods).map(async (goodId) => {
    const goodSnap = await getDocFn(docFn(db, 'goods', goodId))
    if (!goodSnap.exists()) throw new Error(`Товар "${goodId}" не знайдено.`)
    const data = goodSnap.data() || {}
    return [goodId, { name: data.name || goodId, unit: data.unit || 'шт.' }]
  }))

  const targetData = targetSnap.data() || {}
  const targetName = targetData.name || targetData.heroName || targetData.shortName || targetId
  const requestRef = await addDocFn(collectionFn(db, 'goods-requests'), {
    targetType,
    targetId,
    targetName,
    goods: normalizedGoods,
    goodsMeta: Object.fromEntries(goodEntries),
    comment: String(comment || '').slice(0, 500),
    status: 'pending',
    createdAt: serverTimestampFn(),
    createdBy,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
    approvedLogId: null,
  })

  return { id: requestRef.id }
}

export function subscribePendingGoodsRequests(callback, {
  db: firestoreDb,
  collectionFn = collection,
  onSnapshotFn = onSnapshot,
  queryFn = query,
  whereFn = where,
} = {}) {
  const db = firestoreDb ?? getFirestore()
  return onSnapshotFn(
    queryFn(collectionFn(db, 'goods-requests'), whereFn('status', '==', 'pending')),
    (snapshot) => callback(snapshot.docs
      .map((row) => normalizeRequest(row.data(), row.id))
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))),
  )
}

export async function approveGoodsRequest(
  { requestId, reviewedBy = null },
  {
    db: firestoreDb,
    collectionFn = collection,
    docFn = doc,
    runTransactionFn = runTransaction,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  if (!requestId) throw new Error('Заявку не вказано.')

  return runTransactionFn(db, async (transaction) => {
    const requestRef = docFn(db, 'goods-requests', requestId)
    const requestSnap = await transaction.get(requestRef)
    if (!requestSnap.exists()) throw new Error('Заявку не знайдено.')

    const request = normalizeRequest(requestSnap.data(), requestSnap.id)
    if (request.status !== 'pending') throw new Error('Заявку вже розглянуто.')
    if (!Object.keys(request.goods).length) throw new Error('У заявці немає товарів.')

    const targetCollection = request.targetType === 'hero' ? 'heroes' : request.targetType === 'guild' ? 'guilds' : ''
    if (!targetCollection) throw new Error('Невідомий тип рахунку.')
    const targetRef = docFn(db, targetCollection, request.targetId)
    const targetSnap = await transaction.get(targetRef)
    if (!targetSnap.exists()) throw new Error(request.targetType === 'hero' ? 'Героя не знайдено.' : 'Гільдію не знайдено.')

    const targetData = targetSnap.data() || {}
    const nextGoods = { ...(targetData.goods || {}) }
    for (const [goodId, amount] of Object.entries(request.goods)) {
      nextGoods[goodId] = Math.trunc(Number(nextGoods[goodId] || 0)) + amount
    }
    transaction.set(targetRef, { goods: nextGoods, updatedAt: serverTimestampFn() }, { merge: true })

    let logRef
    if (request.targetType === 'hero') {
      logRef = docFn(collectionFn(db, 'hero-transactions'))
      transaction.set(logRef, {
        heroId: request.targetId,
        heroName: targetData.name || targetData.heroName || request.targetName || request.targetId,
        goldAmount: 0,
        goods: request.goods,
        type: 'goods-request-deposit',
        comment: request.comment || 'Поповнення товарів підтверджено адміністратором.',
        requestId: request.id,
        actorName: reviewedBy,
        createdAt: serverTimestampFn(),
      })
    } else {
      logRef = docFn(collectionFn(db, 'guilds', request.targetId, 'logs'))
      transaction.set(logRef, {
        amount: 0,
        type: 'goods-deposit',
        comment: request.comment,
        userNickname: request.createdBy || 'Unknown',
        approvedBy: reviewedBy,
        approvedFromRequestId: request.id,
        createdAt: serverTimestampFn(),
        treasureAfter: Number(targetData.treasure || 0),
        goods: request.goods,
        goodsAfter: nextGoods,
      })
    }

    transaction.update(requestRef, {
      status: 'approved',
      reviewedAt: serverTimestampFn(),
      reviewedBy,
      reviewNote: '',
      approvedLogId: logRef.id,
    })
    return { requestId, targetType: request.targetType, targetId: request.targetId, goods: request.goods, logId: logRef.id }
  })
}

export async function rejectGoodsRequest(
  { requestId, reviewedBy = null, reviewNote = '' },
  {
    db: firestoreDb,
    docFn = doc,
    runTransactionFn = runTransaction,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  if (!requestId) throw new Error('Заявку не вказано.')
  return runTransactionFn(db, async (transaction) => {
    const requestRef = docFn(db, 'goods-requests', requestId)
    const requestSnap = await transaction.get(requestRef)
    if (!requestSnap.exists()) throw new Error('Заявку не знайдено.')
    const request = normalizeRequest(requestSnap.data(), requestSnap.id)
    if (request.status !== 'pending') throw new Error('Заявку вже розглянуто.')
    transaction.update(requestRef, {
      status: 'rejected',
      reviewedAt: serverTimestampFn(),
      reviewedBy,
      reviewNote: String(reviewNote || '').slice(0, 500),
    })
    return { requestId }
  })
}
