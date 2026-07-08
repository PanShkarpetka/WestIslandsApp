# ShipsView

Route: `/ships` — `requiresAuth: false`.

## Purpose
Fleet management page. Displays all ships as cards. Admins can commission new ships or edit existing ones via `ShipEditor` dialog.

The page uses the shared page header, action button, panel, and empty-state primitives. Existing ship cards remain the fleet's primary visual surface.

## Components
- `ShipCard` — displays a single ship's stats, emits `edit` event
- `ShipEditor` (imported as `ShipDetailsDialog`) — form dialog for create/edit

`ShipDetailsDialog` uses `WiDialogFrame` and `WiActionButton`. Hull upgrades are selected independently in an icon-led multi-select and stored in `hullUpgrades`; legacy `hullUpgrade` strings remain readable. Ship cards show hull-upgrade icons at the top-left and weapon icons at the top-right.

## Sorting
- **Admin**: all ships sorted by visibility first (visible before hidden), then by `maxHP` descending
- **Non-admin**: only ships with `visibility: true`, sorted by `maxHP` descending

## New ship defaults
When commissioning a new ship, a full zero-state object is constructed with an empty `hullUpgrades` array and ammunition types: `cannonballs`, `chain`, `grapeshot`, `smokeBombs`, `bolt`, `flamingBolt`, `catapultStone`, `salamanderFuel`, `dragonHeadFuel`.

## Stores
- `useShipStore` — `subscribeToShips()`, `ships`, `saveShip(updatedShip)`
- `useUserStore` — null-safe reactive `isAdmin`

## Save flow
`saveShip()` in the page calls `shipStore.saveShip(updatedShip)` then closes the dialog. The store handles Firestore write.
