# YieldBuildingsPage

Route: `/islands/:islandId/yield-buildings` (child of IslandsPage).

## Purpose
Shows app-managed **Будівлі-постачальники** separately from the LegendKeeper map.

## Data shown
- Reads installed yield buildings from `islands/{islandId}.buildings`.
- Uses `yieldBuildingStore` metadata for display names.
- Shows the next pending harvest date when a yield entry has `processed: false`.
- Displays loading, error, and empty states with shared UI primitives.
- Clicking an installed supplier opens `YieldBuildingDialog`.

## Stores and services
- `islandStore` — island document and `addYieldBuilding()`.
- `yieldBuildingStore` — supplier-building definitions.
- `useUserStore` — null-safe `isAdmin` gate.
- Firestore `cycles` one-time read — current active cycle ID/start date for yield-building defaults.

## Admin behavior
Admins see the "Додати" action for supplier buildings. Adding a supplier building writes through `islandStore.addYieldBuilding()` and does not modify the LegendKeeper map.

## Constraints
- Keep this tab focused on supplier buildings only.
- Preserve existing yield-building Firestore fields and dialog behavior.
