# BuildingsPage

Route: `/islands/:islandId/buildings` (child of IslandsPage).

## Purpose
Island map page. The map itself is now embedded from LegendKeeper because that page owns the current island map and pins.

## Map embed
The page renders an iframe to:

`https://www.legendkeeper.com/p/cma2mu1j719h60zl9frefc3wl/o3dmcy3m`

No local island image, hardcoded pin coordinates, or `IslandBuildingDialog` pin interactions are used here anymore.

## Local data still shown
The page keeps the app-managed **Будівлі-постачальники** section below the embedded map:

- Reads installed yield buildings from `islands/{islandId}.buildings`.
- Uses `yieldBuildingStore` metadata for display names.
- Shows the next pending harvest date when a yield entry has `processed: false`.
- Admins can add yield buildings through the local dialog.

## Stores and services
- `islandStore` — island document and `addYieldBuilding()`.
- `yieldBuildingStore` — supplier-building definitions.
- `useUserStore` — null-safe `isAdmin` gate.
- Firestore `cycles` one-time read — current active cycle ID/start date for yield-building defaults.

## Admin behavior
Admins see the "Додати" action for supplier buildings. Adding a supplier building writes through `islandStore.addYieldBuilding()` and does not modify the LegendKeeper map.
