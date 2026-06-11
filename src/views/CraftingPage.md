# CraftingPage

Route: `/crafting` — `requiresAuth: false`.

## Purpose
Crafting mastery tracker. Shows per-hero progress across categories, subcategories, and item specializations. Includes a price calculator and a full item progress table.

## Layout sections (top to bottom)
1. **Hero banner** — title + Refresh + "Додати крафт" (admin) buttons
2. **Filters row** — hero selector, "show uncrafted" toggle, highest discount chip
3. **Summary metric cards** — total crafted, best discount, capped categories/subcategories/specializations
4. **Progress panel** (left 7/12) — category progress bars + subcategory progress bars
5. **Right panel** (5/12) — top crafted items list + craft price calculator
6. **Item table** — expansion panel with full crafted-item breakdown per hero (collapsible)
7. **Craft dialog** (admin) — `CraftActionForm` for logging a new craft action

## Data loading
`loadData()` fetches via `loadHeroesForCrafting()` and `loadCraftItems()` from `craftingService`. No real-time listener — manual refresh only.

## Discount system
Three tiers of discount, capped at 25% total:
- Category discount (from `categoryProgress`)
- Subcategory discount (from `subcategoryProgress`)
- Specialization discount (per-item mastery)

`recalculateHeroCrafting()` normalizes the hero's crafting state. `getItemDiscountBreakdown()` returns the full breakdown. `calculateFutureCraftPrice()` powers the calculator.

## Calculator
Inputs: item slug + quantity. Output: component price, each discount tier, discounted unit price, final total. Reads from `normalizedCrafting` of the selected hero.

## Admin craft dialog
`CraftActionForm` receives `heroes`, `items`, and `defaultHeroId`. After save, calls `onCraftSaved()` which closes dialog and reloads data.

## Player craft requests
Hero logins (`userStore.heroId`) see a "Подати крафт" action in the hero banner. It opens `CraftActionForm` in `mode="request"` with the hero selector locked to the logged-in hero. Saving requires item quantity and "Зайняло днів" values greater than zero, then creates `crafting-requests/{requestId}` with `status: "pending"`.

Pending requests are not valid crafting progress: they do not update `heroes/{heroId}.crafting`, hero crafting logs, cycle crafting logs, dashboard summaries, or discount calculations. Admin approval in AdminView is the only flow that turns the request into counted crafting.

## Stores & services
- `useUserStore` — `isAdmin`
- `craftingService.js` — `loadCraftItems()`, `loadHeroesForCrafting()`, `getEmptyCraftingState()`
- `src/utils/crafting/craftingCalculations.js` — all discount/progress calculations
