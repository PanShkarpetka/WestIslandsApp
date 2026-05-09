# AdminView — Crafting section

## Purpose
Admin shortcut to log a craft action for any hero without navigating to CraftingPage. Useful during sessions to quickly record what was crafted.

## Component
`CraftActionForm` (`src/components/crafting/CraftActionForm.vue`)

Props passed from AdminView:
- `heroes` — from `heroRows` computed (all heroes with names)
- `items` — from `craftItemsForAdmin` (loaded via `loadCraftItems()`)
- `defaultHeroId` — `selectedHeroIdForCrafting` (auto-set to first hero when heroes load)

## Data loading
`craftItemsForAdmin` is populated by `refreshCraftingAdminData()` which calls `loadCraftItems()` from `craftingService`. Called once on mount and again after a craft is saved (`@saved="refreshCraftingAdminData"`).

## Notes
- This section provides the same form as the dialog on CraftingPage but embedded inline in the admin panel
- `selectedHeroIdForCrafting` is auto-initialized to `heroRows[0].id` via a watcher
