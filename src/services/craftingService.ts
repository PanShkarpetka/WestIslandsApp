import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';
import {
  applyCraftProgress,
  createDefaultItemProgress,
  getCategoryKey,
  getSubcategoryKey,
  recalculateHeroCrafting,
  slugifyKey,
} from '../utils/crafting/craftingCalculations.ts';

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeCraftItem(raw: any, id = '') {
  const name = String(raw?.name || raw?.item || id || '').trim();
  const category = String(raw?.category || 'Unknown').trim();
  const subcategory = String(raw?.subcategory || 'General').trim();
  const slug = String(raw?.slug || slugifyKey(name));

  return {
    name,
    slug,
    category,
    subcategory,
    categoryKey: getCategoryKey(category),
    subcategoryKey: getSubcategoryKey(category, subcategory),
    componentPrice: normalizeNumber(raw?.componentPrice, 0),
    weight: raw?.weight === null || raw?.weight === undefined || raw?.weight === '' ? null : normalizeNumber(raw.weight, 0),
    craftDays: normalizeNumber(raw?.craftDays, 0),
    dc: normalizeNumber(raw?.dc, 0),
    isActive: raw?.isActive !== false,
  };
}

export async function loadCraftItems() {
  const snapshot = await getDocs(query(collection(db, 'craft-items'), orderBy('name', 'asc')));
  return snapshot.docs
    .map((docSnap) => normalizeCraftItem(docSnap.data(), docSnap.id))
    .filter((item) => item.isActive);
}

export async function loadHeroesForCrafting({
  collection: collectionFn = collection,
  getDocs: getDocsFn = getDocs,
  query: queryFn = query,
  orderBy: orderByFn = orderBy,
  db: firestoreDb = db,
}: any = {}) {
  const snapshot = await getDocsFn(queryFn(collectionFn(firestoreDb, 'heroes'), orderByFn('name', 'asc')));
  return snapshot.docs
    .map((docSnap: any) => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        name: data.name || data.heroName || data.nickname || docSnap.id,
        inactive: Boolean(data.inactive),
        crafting: data.crafting || null,
      };
    })
    .filter((hero: any) => !hero.inactive);
}

export function getEmptyCraftingState() {
  return {
    summary: {
      totalCraftActions: 0,
      totalItemsCrafted: 0,
      updatedAt: null,
    },
    itemProgress: {},
    categoryProgress: {},
    subcategoryProgress: {},
  };
}

async function resolveCraftCycle({ cycleId, cycleStartedAt }: any, {
  collection: collectionFn = collection,
  getDocs: getDocsFn = getDocs,
  query: queryFn = query,
  orderBy: orderByFn = orderBy,
  limit: limitFn = limit,
  db: firestoreDb = db,
}: any = {}) {
  if (cycleId) return { cycleId, cycleStartedAt: cycleStartedAt || '' };

  try {
    const snap = await getDocsFn(queryFn(collectionFn(firestoreDb, 'cycles'), orderByFn('createdAt', 'desc'), limitFn(5)));
    const active = snap.docs
      .map((docSnap: any) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
      .find((cycle: any) => cycle.startedAt && !cycle.finishedAt);
    return active ? { cycleId: active.id, cycleStartedAt: active.startedAt || '' } : { cycleId: null, cycleStartedAt: '' };
  } catch (_error) {
    return { cycleId: null, cycleStartedAt: '' };
  }
}

export async function registerCraftAction({ heroId, itemSlug, amountCrafted, craftItems, createdBy = null, cycleId = null, cycleStartedAt = '' }: any, {
  doc: docFn = doc,
  collection: collectionFn = collection,
  getDocs: getDocsFn = getDocs,
  query: queryFn = query,
  orderBy: orderByFn = orderBy,
  limit: limitFn = limit,
  runTransaction: runTransactionFn = runTransaction,
  serverTimestamp: serverTimestampFn = serverTimestamp,
  db: firestoreDb = db,
}: any = {}) {
  const heroRef = docFn(firestoreDb, 'heroes', heroId);
  const logsRef = collectionFn(firestoreDb, 'heroes', heroId, 'crafting-logs');
  const cycleInfo = await resolveCraftCycle({ cycleId, cycleStartedAt }, {
    collection: collectionFn,
    getDocs: getDocsFn,
    query: queryFn,
    orderBy: orderByFn,
    limit: limitFn,
    db: firestoreDb,
  });

  const allItems = (craftItems?.length
    ? craftItems
    : (await getDocsFn(queryFn(collectionFn(firestoreDb, 'craft-items')))).docs.map((row: any) => normalizeCraftItem(row.data(), row.id))
  ).filter((item: any) => item.isActive);

  return runTransactionFn(firestoreDb, async (transaction: any) => {
    const heroDoc = await transaction.get(heroRef);

    if (!heroDoc.exists()) throw new Error('Hero not found');

    const item = allItems.find((row: any) => row.slug === itemSlug);
    if (!item) throw new Error('Craft item not found');

    const heroData = heroDoc.data() || {};
    const heroName = heroData.name || heroData.heroName || heroData.nickname || heroId;
    const currentCrafting = recalculateHeroCrafting(heroData.crafting || getEmptyCraftingState(), allItems);

    const existingProgress = currentCrafting.itemProgress[item.slug] || createDefaultItemProgress(item);
    const progressUpdate = applyCraftProgress(existingProgress, amountCrafted);

    const nextItemProgress = {
      ...currentCrafting.itemProgress,
      [item.slug]: {
        ...progressUpdate.updated,
        updatedAt: Timestamp.now(),
      },
    };

    const recalc = recalculateHeroCrafting(
      {
        ...currentCrafting,
        itemProgress: nextItemProgress,
        summary: {
          ...currentCrafting.summary,
          totalCraftActions: Number(currentCrafting.summary?.totalCraftActions || 0) + 1,
          updatedAt: Timestamp.now(),
        },
      },
      allItems,
    );

    transaction.update(heroRef, {
      crafting: {
        ...recalc,
        summary: {
          ...recalc.summary,
          updatedAt: serverTimestampFn(),
        },
      },
    });

    const logRef = docFn(logsRef);
    const cycleLogRef = docFn(firestoreDb, 'cycle-crafting-logs', `${heroId}_${logRef.id}`);
    const totalComponentPriceAtTime = Number(item.componentPrice || 0) * Number(amountCrafted || 0);

    const logData = {
      id: logRef.id,
      heroId,
      heroName,
      itemSlug: item.slug,
      itemName: item.name,
      amountCrafted: Number(amountCrafted || 0),
      componentPriceAtTime: Number(item.componentPrice || 0),
      totalComponentPriceAtTime,
      categoryBefore: progressUpdate.before.category,
      categoryAfter: progressUpdate.after.category,
      subcategoryBefore: progressUpdate.before.subcategory,
      subcategoryAfter: progressUpdate.after.subcategory,
      specializationBefore: progressUpdate.before.specialization,
      specializationAfter: progressUpdate.after.specialization,
      categoryCappedReached: progressUpdate.categoryCappedReached,
      subcategoryCappedReached: progressUpdate.subcategoryCappedReached,
      specializationCappedReached: progressUpdate.specializationCappedReached,
      createdAt: serverTimestampFn(),
      createdBy,
      cycleId: cycleInfo.cycleId,
      cycleStartedAt: cycleInfo.cycleStartedAt,
    };

    transaction.set(logRef, logData);
    if (cycleInfo.cycleId) {
      transaction.set(cycleLogRef, {
        ...logData,
        sourcePath: logRef.__path || logRef.path || `heroes/${heroId}/crafting-logs/${logRef.id}`,
      });
    }

    return {
      heroId,
      item,
      amountCrafted: Number(amountCrafted || 0),
      crafting: recalc,
      logId: logRef.id,
    };
  });
}
