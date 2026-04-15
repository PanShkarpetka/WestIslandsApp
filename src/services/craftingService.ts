import {
  Timestamp,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  applyCraftProgress,
  createDefaultItemProgress,
  getCategoryKey,
  getSubcategoryKey,
  recalculateHeroCrafting,
  slugifyKey,
} from '@/utils/crafting/craftingCalculations';

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
  const snapshot = await getDocs(query(collection(db, 'craftItems'), orderBy('name', 'asc')));
  return snapshot.docs
    .map((docSnap) => normalizeCraftItem(docSnap.data(), docSnap.id))
    .filter((item) => item.isActive);
}

export async function loadHeroesForCrafting() {
  const snapshot = await getDocs(query(collection(db, 'heroes'), orderBy('name', 'asc')));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: data.name || data.heroName || data.nickname || docSnap.id,
      crafting: data.crafting || null,
    };
  });
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

export async function registerCraftAction({ heroId, itemSlug, amountCrafted, craftItems, createdBy = null }: any) {
  const heroRef = doc(db, 'heroes', heroId);
  const logsRef = collection(db, 'heroes', heroId, 'craftingLogs');

  const allItems = (craftItems?.length
    ? craftItems
    : (await getDocs(query(collection(db, 'craftItems')))).docs.map((row) => normalizeCraftItem(row.data(), row.id))
  ).filter((item: any) => item.isActive);

  return runTransaction(db, async (transaction) => {
    const heroDoc = await transaction.get(heroRef);

    if (!heroDoc.exists()) throw new Error('Hero not found');

    const item = allItems.find((row: any) => row.slug === itemSlug);
    if (!item) throw new Error('Craft item not found');

    const heroData = heroDoc.data() || {};
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
          updatedAt: serverTimestamp(),
        },
      },
    });

    const logRef = doc(logsRef);
    const totalComponentPriceAtTime = Number(item.componentPrice || 0) * Number(amountCrafted || 0);

    transaction.set(logRef, {
      id: logRef.id,
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
      createdAt: serverTimestamp(),
      createdBy,
    });

    return {
      heroId,
      item,
      amountCrafted: Number(amountCrafted || 0),
      crafting: recalc,
      logId: logRef.id,
    };
  });
}
