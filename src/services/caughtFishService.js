import {
  collection,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { DEFAULT_ISLAND_ID } from '../config/constants.js'
import { normalizeAmount } from '../utils/numbers.js'

export const DEFAULT_FISH_SALE_TAX_RATE = 0.1
export function normalizeTelegramUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase()
}

export function isNumericTelegramIdentity(value) {
  return /^\d+$/.test(String(value || '').trim())
}

export function getCaughtFishLookup(telegramId) {
  const value = String(telegramId || '').trim()
  if (!value) return null

  if (isNumericTelegramIdentity(value)) {
    return { field: 'telegramUserId', value }
  }

  return { field: 'telegramUsernameKey', value: normalizeTelegramUsername(value) }
}
export const MISSING_TELEGRAM_ID_MESSAGE = 'Telegram ID не прив’язано до персонажа. Зверніться до адміністратора.'

export function getCaughtFishAccountState(hero) {
  const telegramId = String(hero?.telegramId || '').trim()
  return {
    telegramId,
    canLoadFish: Boolean(telegramId),
    error: telegramId ? '' : MISSING_TELEGRAM_ID_MESSAGE,
  }
}

export function calculateFishSaleTotals(fishes = [], taxRate = DEFAULT_FISH_SALE_TAX_RATE) {
  const gross = normalizeAmount(fishes.reduce((sum, fish) => sum + Number(fish.valueGold ?? 0), 0))
  const rate = Math.max(0, Number(taxRate ?? DEFAULT_FISH_SALE_TAX_RATE) || 0)
  const tax = normalizeAmount(gross * rate)
  const net = normalizeAmount(gross - tax)
  return { gross, tax, net, taxRate: rate }
}

export function isCaughtFishOwnedByHero(fish, { heroId, telegramId }) {
  if (!fish) return false
  const fishHeroId = fish.heroId || ''
  if (fishHeroId) return fishHeroId === heroId

  const ownerTelegramId = String(telegramId || '').trim()
  if (!ownerTelegramId) return false

  if (isNumericTelegramIdentity(ownerTelegramId)) {
    const fishTelegramId = String(fish.telegramUserId || '').trim()
    return fishTelegramId === ownerTelegramId
  }

  const fishUsername = normalizeTelegramUsername(fish.telegramUsernameKey || fish.telegramUsername)
  return Boolean(fishUsername && fishUsername === normalizeTelegramUsername(ownerTelegramId))
}

function assertOwnedAvailableFish(fish, { heroId, telegramId }) {
  if (!fish) throw new Error('Рибу не знайдено.')
  if (fish.status !== 'available') throw new Error('Цю рибу вже оброблено.')

  if (!isCaughtFishOwnedByHero(fish, { heroId, telegramId })) {
    throw new Error('Ця риба належить іншому персонажу.')
  }
}

function normalizeFishIds(caughtFishIds) {
  const ids = [...new Set((caughtFishIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) throw new Error('Оберіть хоча б одну рибину.')
  return ids
}

export async function releaseCaughtFish(
  { heroId, heroName, telegramId, caughtFishIds, actorName },
  {
    db: firestoreDb,
    runTransactionFn = runTransaction,
    docFn = doc,
    collectionFn = collection,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  const ids = normalizeFishIds(caughtFishIds)
  const actor = actorName || heroName || 'Гравець'

  return runTransactionFn(db, async (transaction) => {
    const fishRefs = ids.map((id) => docFn(db, 'caught-fish', id))
    const fishSnaps = []
    for (const ref of fishRefs) {
      fishSnaps.push(await transaction.get(ref))
    }

    const fishes = fishSnaps.map((snap, index) => {
      const data = snap.exists() ? snap.data() : null
      assertOwnedAvailableFish(data, { heroId, telegramId })
      return { id: ids[index], ...data }
    })

    for (const [index, fish] of fishes.entries()) {
      transaction.update(fishRefs[index], {
        status: 'released',
        disposedAt: serverTimestampFn(),
        disposedByHeroId: heroId,
        disposedByHeroName: heroName,
      })
    }

    const txRef = docFn(collectionFn(db, 'hero-transactions'))
    transaction.set(txRef, {
      heroId,
      heroName,
      goldAmount: 0,
      goods: {},
      type: 'fish-release',
      comment: `${actor} відпустив ${fishes.length} рибин: ${fishes.map((fish) => fish.fishName || fish.id).join(', ')}.`,
      createdAt: serverTimestampFn(),
    })

    return { releasedCount: fishes.length }
  })
}

export async function sellCaughtFish(
  { heroId, heroName, telegramId, caughtFishIds, actorName, islandId = DEFAULT_ISLAND_ID },
  {
    db: firestoreDb,
    runTransactionFn = runTransaction,
    docFn = doc,
    collectionFn = collection,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  const ids = normalizeFishIds(caughtFishIds)
  const actor = actorName || heroName || 'Гравець'

  return runTransactionFn(db, async (transaction) => {
    const heroRef = docFn(db, 'heroes', heroId)
    const treasuryRef = docFn(db, 'treasury/meta')
    const islandRef = docFn(db, 'islands', islandId)
    const fishRefs = ids.map((id) => docFn(db, 'caught-fish', id))

    const heroSnap = await transaction.get(heroRef)
    if (!heroSnap.exists()) throw new Error('Героя не знайдено.')
    const heroData = heroSnap.data() || {}

    const treasurySnap = await transaction.get(treasuryRef)
    const treasuryData = treasurySnap.exists() ? treasurySnap.data() || {} : {}

    const islandSnap = await transaction.get(islandRef)
    const islandData = islandSnap.exists() ? islandSnap.data() || {} : {}

    const fishSnaps = []
    for (const ref of fishRefs) {
      fishSnaps.push(await transaction.get(ref))
    }

    const fishes = fishSnaps.map((snap, index) => {
      const data = snap.exists() ? snap.data() : null
      assertOwnedAvailableFish(data, { heroId, telegramId })
      return { id: ids[index], ...data }
    })

    const taxRate = Number(islandData.fishSaleTaxRate ?? DEFAULT_FISH_SALE_TAX_RATE)
    const totals = calculateFishSaleTotals(fishes, taxRate)
    const nextHeroBalance = normalizeAmount(Number(heroData.goldBalance ?? 0) + totals.net)
    const nextTreasuryBalance = normalizeAmount(Number(treasuryData.balance ?? 0) + totals.tax)

    for (const [index] of fishes.entries()) {
      transaction.update(fishRefs[index], {
        status: 'sold',
        disposedAt: serverTimestampFn(),
        disposedByHeroId: heroId,
        disposedByHeroName: heroName,
      })
    }

    transaction.set(heroRef, { goldBalance: nextHeroBalance, updatedAt: serverTimestampFn() }, { merge: true })
    transaction.set(treasuryRef, { balance: nextTreasuryBalance, updatedAt: serverTimestampFn() }, { merge: true })
    if (islandData.fishSaleTaxRate == null) {
      transaction.set(islandRef, { fishSaleTaxRate: DEFAULT_FISH_SALE_TAX_RATE }, { merge: true })
    }

    transaction.set(docFn(collectionFn(db, 'hero-transactions')), {
      heroId,
      heroName,
      goldAmount: totals.net,
      goods: {},
      type: 'fish-sale',
      comment: `${actor} продав ${fishes.length} рибин. До сплати: ${totals.gross.toFixed(2)} зм, податок ${(totals.taxRate * 100).toFixed(0)}%: ${totals.tax.toFixed(2)} зм, зараховано: ${totals.net.toFixed(2)} зм.`,
      fishIds: ids,
      grossAmount: totals.gross,
      taxAmount: totals.tax,
      taxRate: totals.taxRate,
      createdAt: serverTimestampFn(),
    })

    transaction.set(docFn(collectionFn(db, 'treasury-transactions')), {
      amount: totals.tax,
      type: 'fish-tax',
      comment: `Податок з продажу риби: ${heroName || heroId}, ${fishes.length} рибин.`,
      userId: heroId || 'system',
      nickname: heroName || 'Рибалка',
      createdAt: serverTimestampFn(),
      balanceAfter: nextTreasuryBalance,
    })

    return { soldCount: fishes.length, ...totals, heroBalanceAfter: nextHeroBalance, treasuryBalanceAfter: nextTreasuryBalance }
  })
}
