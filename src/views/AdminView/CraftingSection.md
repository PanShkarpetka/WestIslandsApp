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

Pending player requests are subscribed in real time through `subscribePendingCraftingRequests()`. Admins see the requested item, quantity, and "Зайняло днів" value, can mark each pending request with either the approve or reject checkbox, then apply the selected decisions in one batch. Approved requests call `approveCraftingRequest()`, which writes the real hero crafting progress and crafting log before marking the request `approved`. Rejected requests call `rejectCraftingRequest()` and never affect discounts.

The section also loads `cycle-crafting-logs` for the active cycle (`latestCycle` without `finishedAt`) and shows the validated crafting log: time, hero, item, amount, days spent, and author. Pending requests are absent from this log until approved.

## Notes
- This section provides the same form as the dialog on CraftingPage but embedded inline in the admin panel
- `selectedHeroIdForCrafting` is auto-initialized to `heroRows[0].id` via a watcher
- Pending requests remain non-counted until approved
