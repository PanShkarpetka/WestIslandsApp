# IslandInfoPage

Route: `/islands/:islandId` (exact, child of IslandsPage).

## Purpose
Displays and edits core island parameters. Non-admins see read-only values; admins get inline text fields with a save button.

## Editable fields
| Field | Type | Notes |
|-------|------|-------|
| name | string | Island display name |
| population | number | Total population count |
| characters | number | Number of player characters |
| buildingDiscount | number (%) | Discount applied to building costs |
| repairDiscount | number (%) | Discount applied to ship repair costs |

## Stores & data
- `useIslandStore` — `subscribe()` / `stop()`, `updateIsland(payload)`
- `useUserStore` — `isAdmin` gate

## Admin behavior
- All rows render `v-text-field` instead of plain `<span>` when `isAdmin`
- Save triggers `islandStore.updateIsland()` with the full form payload
- Saving state shown via `loading` prop on the save button

## UI pattern
"Captain's log" card: dark gradient background, alternating row tint, label-value rows. Discount values styled gold with `wi-number` font.
