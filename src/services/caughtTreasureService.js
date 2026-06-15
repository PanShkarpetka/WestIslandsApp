import {
  collection,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getCaughtFishLookup,
  isNumericTelegramIdentity,
  normalizeTelegramUsername,
} from './caughtFishService.js'

export const getCaughtTreasureLookup = getCaughtFishLookup

export function isCaughtTreasureOwnedByHero(treasure, { heroId, telegramId }) {
  if (!treasure) return false
  const treasureHeroId = treasure.heroId || ''
  if (treasureHeroId) return treasureHeroId === heroId

  const ownerTelegramId = String(telegramId || '').trim()
  if (!ownerTelegramId) return false

  if (isNumericTelegramIdentity(ownerTelegramId)) {
    return String(treasure.telegramUserId || '').trim() === ownerTelegramId
  }

  const treasureUsername = normalizeTelegramUsername(treasure.telegramUsernameKey || treasure.telegramUsername)
  return Boolean(treasureUsername && treasureUsername === normalizeTelegramUsername(ownerTelegramId))
}

function assertOwnedAvailableTreasure(treasure, { heroId, telegramId, isAdmin }) {
  if (!treasure) throw new Error('Скарб не знайдено.')
  if (treasure.status !== 'available') throw new Error('Цей скарб уже прибрано.')
  if (!isAdmin && !isCaughtTreasureOwnedByHero(treasure, { heroId, telegramId })) {
    throw new Error('Цей скарб належить іншому персонажу.')
  }
}

export async function removeCaughtTreasure(
  { heroId, heroName, telegramId, treasureId, actorName, isAdmin = false },
  {
    db: firestoreDb,
    runTransactionFn = runTransaction,
    docFn = doc,
    collectionFn = collection,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  const db = firestoreDb ?? getFirestore()
  const id = String(treasureId || '').trim()
  if (!id) throw new Error('Оберіть скарб.')

  return runTransactionFn(db, async (transaction) => {
    const treasureRef = docFn(db, 'caught-treasures', id)
    const treasureSnap = await transaction.get(treasureRef)
    const treasure = treasureSnap.exists() ? treasureSnap.data() : null
    assertOwnedAvailableTreasure(treasure, { heroId, telegramId, isAdmin })

    const ownerHeroId = treasure.heroId || heroId
    const ownerHeroName = treasure.heroName || heroName || ownerHeroId
    const actor = actorName || heroName || 'Гравець'

    transaction.update(treasureRef, {
      status: 'removed',
      removedAt: serverTimestampFn(),
      removedByHeroId: heroId,
      removedByHeroName: heroName,
      removedByAdmin: Boolean(isAdmin),
    })

    transaction.set(docFn(collectionFn(db, 'hero-transactions')), {
      heroId: ownerHeroId,
      heroName: ownerHeroName,
      goldAmount: 0,
      goods: {},
      type: 'treasure-remove',
      comment: `${actor} прибрав скарб "${treasure.treasureName || treasure.name || id}" (${Number(treasure.valueGold || 0).toFixed(2)} зм).`,
      treasureId: id,
      treasureName: treasure.treasureName || treasure.name || id,
      treasureValueGold: Number(treasure.valueGold || 0),
      createdAt: serverTimestampFn(),
    })

    return { removedCount: 1, treasureId: id }
  })
}
