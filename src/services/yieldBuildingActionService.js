import {
  collection,
  doc,
  getFirestore,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { normalizeAmount } from '../utils/numbers.js'

export const YIELD_BUILDING_INCOME_TYPES = Object.freeze({
  SCHEDULED: 'scheduled',
  OWNER_ACTION: 'owner-action',
})

export function normalizeYieldActionVariant(variant, index = 0) {
  return {
    id: String(variant?.id || `variant-${index + 1}`).trim(),
    goodId: String(variant?.goodId || '').trim(),
    amount: Math.trunc(Number(variant?.amount || 0)),
  }
}

export function validateYieldBuildingActionConfig({ actionCostGold, maxUsesPerCycle, actionVariants } = {}) {
  const cost = normalizeAmount(Number(actionCostGold))
  const maxUses = Math.trunc(Number(maxUsesPerCycle))
  const variants = (Array.isArray(actionVariants) ? actionVariants : [])
    .map(normalizeYieldActionVariant)

  if (!Number.isFinite(cost) || cost <= 0) throw new Error('Вартість дії має бути більшою за 0.')
  if (!Number.isInteger(maxUses) || maxUses < 1) throw new Error('Кількість використань за цикл має бути не меншою за 1.')
  if (!variants.length) throw new Error('Додайте хоча б один варіант товару.')
  if (variants.some((variant) => !variant.id || !variant.goodId || variant.amount < 1)) {
    throw new Error('Кожен варіант повинен містити товар і додатну кількість.')
  }
  if (new Set(variants.map((variant) => variant.id)).size !== variants.length) {
    throw new Error('Ідентифікатори варіантів товару мають бути унікальними.')
  }

  return { actionCostGold: cost, maxUsesPerCycle: maxUses, actionVariants: variants }
}

export async function useYieldBuildingAction(
  { islandId, buildingKey, heroId, leaderGuildIds = [], actorName = '', cycleId, variantId },
  {
    db: firestoreDb,
    runTransactionFn = runTransaction,
    docFn = doc,
    collectionFn = collection,
    serverTimestampFn = serverTimestamp,
  } = {},
) {
  if (!islandId || !buildingKey || !cycleId || !variantId) {
    throw new Error('Не вдалося визначити будівлю, цикл або товар.')
  }

  const db = firestoreDb ?? getFirestore()
  return runTransactionFn(db, async (transaction) => {
    const islandRef = docFn(db, 'islands', islandId)
    const cycleRef = docFn(db, 'cycles', cycleId)
    const [islandSnap, cycleSnap] = await Promise.all([
      transaction.get(islandRef),
      transaction.get(cycleRef),
    ])

    if (!islandSnap.exists()) throw new Error('Острів не знайдено.')
    if (!cycleSnap.exists()) throw new Error('Поточний цикл не знайдено.')

    const cycleData = cycleSnap.data() || {}
    if (!cycleData.startedAt || cycleData.finishedAt) throw new Error('Немає активного циклу.')

    const islandData = islandSnap.data() || {}
    const buildings = { ...(islandData.buildings || {}) }
    const building = { ...(buildings[buildingKey] || {}) }
    if (!building.built || !building.yieldBuildingId) throw new Error('Будівлю не знайдено на острові.')

    const ownerType = building.ownerType || (building.ownerGuildId ? 'guild' : 'hero')
    const ownerId = building.ownerId || building.ownerGuildId || building.ownerHeroId || ''
    if (!['hero', 'guild'].includes(ownerType) || !ownerId) throw new Error('Для будівлі не налаштовано власника.')
    if (ownerType === 'hero' && ownerId !== heroId) throw new Error('Ця дія доступна лише власнику будівлі.')
    if (ownerType === 'guild' && !(Array.isArray(leaderGuildIds) ? leaderGuildIds : []).includes(ownerId)) {
      throw new Error('Ця дія доступна лише лідеру гільдії-власника.')
    }

    const definitionRef = docFn(db, 'yield-buildings', building.yieldBuildingId)
    const definitionSnap = await transaction.get(definitionRef)
    if (!definitionSnap.exists()) throw new Error('Налаштування будівлі не знайдено.')

    const definition = definitionSnap.data() || {}
    if (definition.incomeType !== YIELD_BUILDING_INCOME_TYPES.OWNER_ACTION) {
      throw new Error('Для цієї будівлі немає дії власника.')
    }
    const config = validateYieldBuildingActionConfig(definition)
    const variant = config.actionVariants.find((item) => item.id === variantId)
    if (!variant) throw new Error('Обраний варіант товару більше не доступний.')

    const goodRef = docFn(db, 'goods', variant.goodId)
    const goodSnap = await transaction.get(goodRef)
    if (!goodSnap.exists()) throw new Error('Обраний товар не існує. Спочатку створіть його в адмін-панелі.')

    const ownerRef = ownerType === 'guild'
      ? docFn(db, 'guilds', ownerId)
      : docFn(db, 'heroes', ownerId)
    const ownerSnap = await transaction.get(ownerRef)
    if (!ownerSnap.exists()) throw new Error(ownerType === 'guild' ? 'Гільдію-власника не знайдено.' : 'Героя не знайдено.')

    const usage = building.actionUsage?.cycleId === cycleId
      ? Math.max(0, Math.trunc(Number(building.actionUsage.count || 0)))
      : 0
    if (usage >= config.maxUsesPerCycle) throw new Error('Ліміт використань цієї будівлі в поточному циклі вичерпано.')

    const owner = ownerSnap.data() || {}
    const balanceField = ownerType === 'guild' ? 'treasure' : 'goldBalance'
    const currentGold = normalizeAmount(Number(owner[balanceField] || 0))
    if (currentGold < config.actionCostGold) {
      throw new Error(ownerType === 'guild' ? 'Недостатньо золота на балансі гільдії.' : 'Недостатньо золота на балансі героя.')
    }

    const currentGoods = { ...(owner.goods || {}) }
    const currentQuantity = Math.max(0, Math.trunc(Number(currentGoods[variant.goodId] || 0)))
    currentGoods[variant.goodId] = currentQuantity + variant.amount
    const nextGold = normalizeAmount(currentGold - config.actionCostGold)

    building.actionUsage = { cycleId, count: usage + 1 }
    buildings[buildingKey] = building

    transaction.set(ownerRef, {
      [balanceField]: nextGold,
      goods: currentGoods,
      updatedAt: serverTimestampFn(),
    }, { merge: true })
    transaction.set(islandRef, { buildings }, { merge: true })
    const comment = `Використано дію будівлі «${definition.name || building.name || buildingKey}».`
    if (ownerType === 'guild') {
      transaction.set(docFn(collectionFn(db, 'guilds', ownerId, 'logs')), {
        amount: -config.actionCostGold,
        goods: { [variant.goodId]: variant.amount },
        goodsAfter: currentGoods,
        type: 'building-action',
        comment,
        userNickname: (actorName || owner.leader || 'Лідер гільдії').slice(0, 80),
        treasureAfter: nextGold,
        islandId,
        buildingKey,
        yieldBuildingId: building.yieldBuildingId,
        cycleId,
        actionVariantId: variant.id,
        createdAt: serverTimestampFn(),
      })
    } else {
      transaction.set(docFn(collectionFn(db, 'hero-transactions')), {
        heroId: ownerId,
        heroName: owner.name || ownerId,
        goldAmount: -config.actionCostGold,
        goods: { [variant.goodId]: variant.amount },
        type: 'building-action',
        comment,
        islandId,
        buildingKey,
        yieldBuildingId: building.yieldBuildingId,
        cycleId,
        actionVariantId: variant.id,
        createdAt: serverTimestampFn(),
      })
    }

    return {
      ownerType,
      ownerId,
      ...(ownerType === 'hero' ? { heroId: ownerId } : { guildId: ownerId }),
      goodId: variant.goodId,
      goodName: goodSnap.data()?.name || variant.goodId,
      amount: variant.amount,
      goldSpent: config.actionCostGold,
      remainingUses: config.maxUsesPerCycle - usage - 1,
      newGoldBalance: nextGold,
    }
  })
}
