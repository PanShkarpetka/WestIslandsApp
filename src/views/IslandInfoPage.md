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
- `useIslandStore` — island data supplied by the parent `IslandsPage` subscription; `updateIsland(payload)` saves admin edits
- `useUserStore` — `isAdmin` gate

## Admin behavior
- All rows render `v-text-field` instead of plain `<span>` when `isAdmin`
- Save triggers `islandStore.updateIsland()` with the full form payload
- Saving state shown via `loading` prop on the save button

## UI pattern
`WiPanel` frames the compact label-value rows and `WiActionButton` provides the admin save action. Discount values remain styled gold with `wi-number` font.
