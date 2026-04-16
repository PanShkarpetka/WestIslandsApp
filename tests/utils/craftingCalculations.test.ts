import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCraftProgress,
  calculateFutureCraftPrice,
  createDefaultItemProgress,
  getItemDiscountBreakdown,
  recalculateHeroCrafting,
} from '../../src/utils/crafting/craftingCalculations.ts';

const craftItems = [
  { name: 'Item A', slug: 'item-a', category: 'Armor', subcategory: 'Light', componentPrice: 100, weight: 1, craftDays: 1, dc: 10, isActive: true },
  { name: 'Item B', slug: 'item-b', category: 'Armor', subcategory: 'Light', componentPrice: 120, weight: 1, craftDays: 1, dc: 10, isActive: true },
  { name: 'Item C', slug: 'item-c', category: 'Armor', subcategory: 'Heavy', componentPrice: 140, weight: 1, craftDays: 1, dc: 10, isActive: true },
  { name: 'Item D', slug: 'item-d', category: 'Armor', subcategory: 'Heavy', componentPrice: 140, weight: 1, craftDays: 1, dc: 10, isActive: true },
  { name: 'Item E', slug: 'item-e', category: 'Armor', subcategory: 'Heavy', componentPrice: 140, weight: 1, craftDays: 1, dc: 10, isActive: true },
];

test('Case 1: new hero craft 50 fills category only', () => {
  const base = createDefaultItemProgress(craftItems[0]);
  const result = applyCraftProgress(base, 50);
  assert.equal(result.updated.categoryContribution, 50);
  assert.equal(result.updated.subcategoryContribution, 0);
  assert.equal(result.updated.specializationProgress, 0);
});

test('Case 2: category overflow goes into subcategory', () => {
  const base = { ...createDefaultItemProgress(craftItems[0]), categoryContribution: 90 };
  const result = applyCraftProgress(base, 20);
  assert.equal(result.updated.categoryContribution, 100);
  assert.equal(result.updated.subcategoryContribution, 10);
});

test('Case 3: subcategory overflow goes into specialization', () => {
  const base = {
    ...createDefaultItemProgress(craftItems[0]),
    categoryContribution: 100,
    subcategoryContribution: 95,
  };
  const result = applyCraftProgress(base, 10);
  assert.equal(result.updated.subcategoryContribution, 100);
  assert.equal(result.updated.specializationProgress, 5);
});

test('Case 4: fully maxed item only increases crafted amount', () => {
  const base = {
    ...createDefaultItemProgress(craftItems[0]),
    craftedAmount: 300,
    categoryContribution: 100,
    subcategoryContribution: 100,
    specializationProgress: 100,
  };
  const result = applyCraftProgress(base, 25);
  assert.equal(result.updated.craftedAmount, 325);
  assert.equal(result.updated.categoryContribution, 100);
  assert.equal(result.updated.subcategoryContribution, 100);
  assert.equal(result.updated.specializationProgress, 100);
});

test('Case 5: category aggregation and discount formula', () => {
  const state = recalculateHeroCrafting(
    {
      itemProgress: {
        'item-a': { ...createDefaultItemProgress(craftItems[0]), categoryContribution: 100 },
      },
    },
    craftItems,
  );

  const armor = state.categoryProgress.armor;
  assert.equal(armor.current, 100);
  assert.equal(armor.max, 500);
  assert.equal(Number(armor.progressPercent.toFixed(3)), 20);
  assert.equal(Number(armor.discountPercent.toFixed(3)), 1.4);
});

test('Case 6: subcategory aggregation and discount formula', () => {
  const state = recalculateHeroCrafting(
    {
      itemProgress: {
        'item-c': { ...createDefaultItemProgress(craftItems[2]), categoryContribution: 100, subcategoryContribution: 100 },
      },
    },
    craftItems,
  );

  const heavy = state.subcategoryProgress['armor__heavy'];
  assert.equal(heavy.current, 100);
  assert.equal(heavy.max, 300);
  assert.equal(Number(heavy.progressPercent.toFixed(3)), 33.333);
  assert.equal(Number(heavy.discountPercent.toFixed(3)), 2.667);
});

test('discount breakdown + future craft calculator', () => {
  const state = recalculateHeroCrafting(
    {
      itemProgress: {
        'item-c': {
          ...createDefaultItemProgress(craftItems[2]),
          categoryContribution: 100,
          subcategoryContribution: 100,
          specializationProgress: 50,
        },
      },
    },
    craftItems,
  );

  const discounts = getItemDiscountBreakdown(state, craftItems[2]);
  assert.ok(discounts.totalDiscount > 0);

  const calc = calculateFutureCraftPrice(state, craftItems[2], 4);
  assert.equal(calc.baseTotalComponentPrice, 560);
  assert.ok(calc.finalTotalComponentPrice < calc.baseTotalComponentPrice);
});
