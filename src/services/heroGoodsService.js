import {
  collection,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'

export async function adjustHeroGoods(
  { heroId, goodId, delta, comment = '', actor = null },
  {
    db: firestoreDb,
    runTransactionFn = runTransaction,
    docFn = doc,
    collectionFn = collection,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  const normalizedDelta = Math.trunc(Number(delta || 0))

  if (!heroId) throw new Error('Не вдалося визначити героя.')
  if (!goodId) throw new Error('Оберіть товар.')
  if (!normalizedDelta) throw new Error('Кількість має бути ненульовою.')

  return runTransactionFn(db, async (transaction) => {
    const heroRef = docFn(db, 'heroes', heroId)
    const goodRef = docFn(db, 'goods', goodId)
    const [heroSnap, goodSnap] = await Promise.all([
      transaction.get(heroRef),
      transaction.get(goodRef),
    ])

    if (!heroSnap.exists()) throw new Error('Героя не знайдено.')
    if (!goodSnap.exists()) throw new Error('Товар не знайдено.')

    const heroData = heroSnap.data() || {}
    const goodData = goodSnap.data() || {}
    const currentGoods = heroData.goods || {}
    const currentQty = Math.trunc(Number(currentGoods[goodId] || 0))
    const nextQty = currentQty + normalizedDelta
    if (nextQty < 0) throw new Error('Недостатньо товару на балансі героя.')

    const nextGoods = { ...currentGoods }
    if (nextQty > 0) nextGoods[goodId] = nextQty
    else delete nextGoods[goodId]

    const heroName = heroData.name || heroData.heroName || heroData.nickname || heroId
    const goodName = goodData.name || goodId
    const unit = goodData.unit || 'шт.'
    const actorName = actor?.nickname || actor?.name || 'Адмін'

    transaction.set(heroRef, { goods: nextGoods, updatedAt: serverTimestampFn() }, { merge: true })
    transaction.set(docFn(collectionFn(db, 'hero-transactions')), {
      heroId,
      heroName,
      goldAmount: 0,
      goods: { [goodId]: normalizedDelta },
      type: 'admin-goods-adjustment',
      comment: (comment || `${actorName} змінив товар "${goodName}" на ${normalizedDelta > 0 ? '+' : ''}${normalizedDelta} ${unit}.`).slice(0, 500),
      actorName,
      createdAt: serverTimestampFn(),
    })

    return { heroId, heroName, goodId, goodName, previousQty: currentQty, newQty: nextQty, delta: normalizedDelta }
  })
}
