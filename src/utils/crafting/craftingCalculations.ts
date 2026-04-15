export type CraftItem = {
  name: string;
  slug: string;
  category: string;
  subcategory: string;
  componentPrice: number;
  weight: number | null;
  craftDays: number;
  dc: number;
  isActive: boolean;
};

export type ItemProgress = {
  itemName: string;
  category: string;
  subcategory: string;
  craftedAmount: number;
  categoryContribution: number;
  subcategoryContribution: number;
  specializationProgress: number;
  categoryUnlocked: boolean;
  subcategoryUnlocked: boolean;
  specializationUnlocked: boolean;
  categoryCapped: boolean;
  subcategoryCapped: boolean;
  specializationCapped: boolean;
  updatedAt?: unknown;
};

export const MAX_CATEGORY_DISCOUNT = 7;
export const MAX_SUBCATEGORY_DISCOUNT = 8;
export const MAX_SPECIALIZATION_DISCOUNT = 10;
export const MAX_TOTAL_DISCOUNT = 25;

export function slugifyKey(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

export function getCategoryKey(category: string): string {
  return slugifyKey(category);
}

export function getSubcategoryKey(category: string, subcategory: string): string {
  return `${getCategoryKey(category)}__${slugifyKey(subcategory)}`;
}

export function createDefaultItemProgress(item: CraftItem): ItemProgress {
  return {
    itemName: item.name,
    category: item.category,
    subcategory: item.subcategory,
    craftedAmount: 0,
    categoryContribution: 0,
    subcategoryContribution: 0,
    specializationProgress: 0,
    categoryUnlocked: true,
    subcategoryUnlocked: false,
    specializationUnlocked: false,
    categoryCapped: false,
    subcategoryCapped: false,
    specializationCapped: false,
  };
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

export function normalizeItemProgress(item: CraftItem, progress?: Partial<ItemProgress>): ItemProgress {
  const normalized = {
    ...createDefaultItemProgress(item),
    ...(progress || {}),
  };

  normalized.categoryContribution = clampProgress(normalized.categoryContribution);
  normalized.subcategoryContribution = clampProgress(normalized.subcategoryContribution);
  normalized.specializationProgress = clampProgress(normalized.specializationProgress);
  normalized.craftedAmount = Math.max(0, Number(normalized.craftedAmount || 0));

  normalized.categoryUnlocked = true;
  normalized.subcategoryUnlocked = normalized.categoryContribution >= 100;
  normalized.specializationUnlocked = normalized.subcategoryContribution >= 100;
  normalized.categoryCapped = normalized.categoryContribution >= 100;
  normalized.subcategoryCapped = normalized.subcategoryContribution >= 100;
  normalized.specializationCapped = normalized.specializationProgress >= 100;

  return normalized;
}

export function buildCraftItemIndexes(craftItems: CraftItem[]) {
  const bySlug = new Map<string, CraftItem>();
  const byCategory = new Map<string, CraftItem[]>();
  const bySubcategory = new Map<string, CraftItem[]>();

  for (const item of craftItems || []) {
    if (!item?.slug) continue;
    bySlug.set(item.slug, item);

    const categoryKey = getCategoryKey(item.category);
    const subcategoryKey = getSubcategoryKey(item.category, item.subcategory);

    if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
    if (!bySubcategory.has(subcategoryKey)) bySubcategory.set(subcategoryKey, []);

    byCategory.get(categoryKey)?.push(item);
    bySubcategory.get(subcategoryKey)?.push(item);
  }

  return { bySlug, byCategory, bySubcategory };
}

export function getCategoryMax(category: string, craftItems: CraftItem[]): number {
  const key = getCategoryKey(category);
  return (craftItems || []).filter((item) => getCategoryKey(item.category) === key).length * 100;
}

export function getSubcategoryMax(category: string, subcategory: string, craftItems: CraftItem[]): number {
  const key = getSubcategoryKey(category, subcategory);
  return (craftItems || []).filter((item) => getSubcategoryKey(item.category, item.subcategory) === key).length * 100;
}

export function applyCraftProgress(itemProgress: ItemProgress, amountCrafted: number) {
  const crafted = Math.max(0, Number(amountCrafted || 0));
  const before = {
    category: itemProgress.categoryContribution,
    subcategory: itemProgress.subcategoryContribution,
    specialization: itemProgress.specializationProgress,
  };

  let remaining = crafted;
  const updated: ItemProgress = { ...itemProgress, craftedAmount: itemProgress.craftedAmount + crafted };

  const addToCategory = Math.min(remaining, 100 - updated.categoryContribution);
  updated.categoryContribution += addToCategory;
  remaining -= addToCategory;

  const addToSubcategory = Math.min(remaining, 100 - updated.subcategoryContribution);
  if (updated.categoryContribution >= 100) {
    updated.subcategoryContribution += addToSubcategory;
    remaining -= addToSubcategory;
  }

  const addToSpecialization = Math.min(remaining, 100 - updated.specializationProgress);
  if (updated.subcategoryContribution >= 100) {
    updated.specializationProgress += addToSpecialization;
    remaining -= addToSpecialization;
  }

  const normalized = normalizeItemProgress(
    {
      name: updated.itemName,
      slug: '',
      category: updated.category,
      subcategory: updated.subcategory,
      componentPrice: 0,
      weight: null,
      craftDays: 0,
      dc: 0,
      isActive: true,
    },
    updated,
  );

  return {
    updated: normalized,
    before,
    after: {
      category: normalized.categoryContribution,
      subcategory: normalized.subcategoryContribution,
      specialization: normalized.specializationProgress,
    },
    categoryCappedReached: before.category < 100 && normalized.categoryContribution === 100,
    subcategoryCappedReached: before.subcategory < 100 && normalized.subcategoryContribution === 100,
    specializationCappedReached: before.specialization < 100 && normalized.specializationProgress === 100,
    leftovers: {
      afterCategory: crafted - addToCategory,
      afterSubcategory: Math.max(0, crafted - addToCategory - addToSubcategory),
      afterSpecialization: remaining,
    },
  };
}

export function recalculateHeroCrafting(craftingState: any, craftItems: CraftItem[]) {
  const itemProgress = craftingState?.itemProgress || {};

  const categoryProgress: Record<string, any> = {};
  const subcategoryProgress: Record<string, any> = {};

  for (const item of craftItems || []) {
    const progress = normalizeItemProgress(item, itemProgress[item.slug]);
    const categoryKey = getCategoryKey(item.category);
    const subcategoryKey = getSubcategoryKey(item.category, item.subcategory);

    if (!categoryProgress[categoryKey]) {
      categoryProgress[categoryKey] = {
        name: item.category,
        current: 0,
        max: 0,
        progressPercent: 0,
        discountPercent: 0,
        itemCount: 0,
      };
    }

    if (!subcategoryProgress[subcategoryKey]) {
      subcategoryProgress[subcategoryKey] = {
        name: item.subcategory,
        category: item.category,
        current: 0,
        max: 0,
        progressPercent: 0,
        discountPercent: 0,
        itemCount: 0,
      };
    }

    categoryProgress[categoryKey].current += progress.categoryContribution;
    categoryProgress[categoryKey].itemCount += 1;

    subcategoryProgress[subcategoryKey].current += progress.subcategoryContribution;
    subcategoryProgress[subcategoryKey].itemCount += 1;
  }

  for (const value of Object.values(categoryProgress) as any[]) {
    value.max = value.itemCount * 100;
    value.progressPercent = value.max ? (value.current / value.max) * 100 : 0;
    value.discountPercent = value.max ? (value.current / value.max) * MAX_CATEGORY_DISCOUNT : 0;
  }

  for (const value of Object.values(subcategoryProgress) as any[]) {
    value.max = value.itemCount * 100;
    value.progressPercent = value.max ? (value.current / value.max) * 100 : 0;
    value.discountPercent = value.max ? (value.current / value.max) * MAX_SUBCATEGORY_DISCOUNT : 0;
  }

  const normalizedItemProgress: Record<string, ItemProgress> = {};
  for (const item of craftItems || []) {
    normalizedItemProgress[item.slug] = normalizeItemProgress(item, itemProgress[item.slug]);
  }

  const summary = {
    totalCraftActions: Number(craftingState?.summary?.totalCraftActions || 0),
    totalItemsCrafted: Object.values(normalizedItemProgress).reduce((acc, row) => acc + (row.craftedAmount || 0), 0),
    updatedAt: craftingState?.summary?.updatedAt || null,
  };

  return {
    ...(craftingState || {}),
    summary,
    itemProgress: normalizedItemProgress,
    categoryProgress,
    subcategoryProgress,
  };
}

export function getItemDiscountBreakdown(heroCrafting: any, item: CraftItem) {
  const categoryKey = getCategoryKey(item.category);
  const subcategoryKey = getSubcategoryKey(item.category, item.subcategory);
  const itemProgress = heroCrafting?.itemProgress?.[item.slug] || createDefaultItemProgress(item);

  const categoryDiscount = Number(heroCrafting?.categoryProgress?.[categoryKey]?.discountPercent || 0);
  const subcategoryDiscount = Number(heroCrafting?.subcategoryProgress?.[subcategoryKey]?.discountPercent || 0);
  const specializationDiscount = (Number(itemProgress.specializationProgress || 0) / 100) * MAX_SPECIALIZATION_DISCOUNT;

  const totalDiscount = Math.min(
    MAX_TOTAL_DISCOUNT,
    categoryDiscount + subcategoryDiscount + specializationDiscount,
  );

  return {
    categoryDiscount,
    subcategoryDiscount,
    specializationDiscount,
    totalDiscount,
  };
}

export function getSortedCraftRows(heroCrafting: any, craftItems: CraftItem[]) {
  return (craftItems || [])
    .map((item) => {
      const progress = heroCrafting?.itemProgress?.[item.slug] || createDefaultItemProgress(item);
      return {
        item,
        progress,
      };
    })
    .sort((a, b) => {
      const aCrafted = Number(a.progress.craftedAmount || 0);
      const bCrafted = Number(b.progress.craftedAmount || 0);

      if (aCrafted === 0 && bCrafted > 0) return 1;
      if (bCrafted === 0 && aCrafted > 0) return -1;
      if (bCrafted !== aCrafted) return bCrafted - aCrafted;

      const categorySort = a.item.category.localeCompare(b.item.category);
      if (categorySort !== 0) return categorySort;

      const subcategorySort = a.item.subcategory.localeCompare(b.item.subcategory);
      if (subcategorySort !== 0) return subcategorySort;

      return a.item.name.localeCompare(b.item.name);
    });
}

export function calculateFutureCraftPrice(heroCrafting: any, item: CraftItem, amountToCraft: number) {
  const amount = Math.max(0, Number(amountToCraft || 0));
  const discount = getItemDiscountBreakdown(heroCrafting, item);
  const componentPrice = Number(item.componentPrice || 0);
  const discountedUnitComponentPrice = componentPrice * (1 - discount.totalDiscount / 100);
  const baseTotalComponentPrice = componentPrice * amount;
  const finalTotalComponentPrice = discountedUnitComponentPrice * amount;

  return {
    amount,
    componentPrice,
    baseTotalComponentPrice,
    discountedUnitComponentPrice,
    finalTotalComponentPrice,
    ...discount,
  };
}
