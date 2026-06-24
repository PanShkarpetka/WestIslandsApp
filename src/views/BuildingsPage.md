# BuildingsPage

Route: `/islands/:islandId/buildings` (child of IslandsPage).

## Purpose
Island map page. LegendKeeper owns the current island map and pins; this app only embeds that map and manages local yield-building records.

## Map embed
The page renders an iframe to:

`https://www.legendkeeper.com/p/cma2mu1j719h60zl9frefc3wl/o3dmcy3m`

The embed is the primary map surface. No local island image, hardcoded pin coordinates, building detail panels, or `IslandBuildingDialog` pin interactions are used here anymore. The page also provides an external-open action for cases where the embedded LegendKeeper view is unavailable.

## Local data still shown
The page keeps the app-managed **Будівлі-постачальники** section below the embedded map:

- Reads installed yield buildings from `islands/{islandId}.buildings`.
- Uses `yieldBuildingStore` metadata for display names.
- Shows the next pending harvest date when a yield entry has `processed: false`.
- Displays loading, error, and empty states with shared UI primitives.
- Admins can add yield buildings through the local dialog.
- Clicking an installed supplier opens `YieldBuildingDialog`; this is the only local building interaction kept on the page.

## Stores and services
- `islandStore` — island document and `addYieldBuilding()`.
- `yieldBuildingStore` — supplier-building definitions.
- `useUserStore` — null-safe `isAdmin` gate.
- Firestore `cycles` one-time read — current active cycle ID/start date for yield-building defaults.

## Admin behavior
Admins see the "Додати" action for supplier buildings. Adding a supplier building writes through `islandStore.addYieldBuilding()` and does not modify the LegendKeeper map.

## Constraints
- Do not reintroduce local map pins or standard building detail/edit dialogs.
- Keep LegendKeeper as the source of truth for map markers.
- Preserve existing yield-building Firestore fields and dialog behavior.
