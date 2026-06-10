import {
  collection,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { normalizeAmount } from '../utils/numbers.js'

export const SNAPSHOT_HISTORY_DEFAULT_OPEN = false

export async function adjustHeroGoldBalance(
  { heroId, newBalance, comment, actor },
  {
    db: firestoreDb,
    runTransactionFn = runTransaction,
    docFn = doc,
    collectionFn = collection,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  const targetBalance = normalizeAmount(newBalance)
  if (!heroId) throw new Error('Не вдалося визначити героя.')
  if (!Number.isFinite(targetBalance) || targetBalance < 0) {
    throw new Error('Баланс має бути невідʼємним числом.')
  }

  return runTransactionFn(db, async (transaction) => {
    const heroRef = docFn(db, 'heroes', heroId)
    const heroSnap = await transaction.get(heroRef)
    if (!heroSnap.exists()) throw new Error('Героя не знайдено.')

    const heroData = heroSnap.data() || {}
    const currentBalance = normalizeAmount(Number(heroData.goldBalance ?? 0))
    const delta = normalizeAmount(targetBalance - currentBalance)
    const heroName = heroData.name || heroId

    transaction.set(heroRef, { goldBalance: targetBalance, updatedAt: serverTimestampFn() }, { merge: true })
    transaction.set(docFn(collectionFn(db, 'hero-transactions')), {
      heroId,
      heroName,
      goldAmount: delta,
      goods: {},
      type: 'admin-balance-adjustment',
      comment: (comment || `Адмін змінив баланс акаунта з ${currentBalance.toFixed(2)} до ${targetBalance.toFixed(2)} зм.`).slice(0, 500),
      actorName: actor?.nickname || actor?.name || 'Адмін',
      createdAt: serverTimestampFn(),
    })

    return { heroId, heroName, previousBalance: currentBalance, newBalance: targetBalance, delta }
  })
}
