# YieldBuildingsPage

Route: `/islands/:islandId/yield-buildings` (child of IslandsPage).

## Purpose
Shows app-managed **Будівлі-постачальники** separately from the LegendKeeper map.

## Data shown
- Reads installed yield buildings from `islands/{islandId}.buildings`.
- Uses `yieldBuildingStore` metadata for display names.
- Scheduled buildings show the next pending harvest date when a yield entry has `processed: false`.
- Owner-action buildings show their owner and remaining uses in the active cycle.
- Displays loading, error, and empty states with shared UI primitives.
- Clicking an installed supplier opens `YieldBuildingDialog`.

## Stores and services
- `islandStore` — island document and `addYieldBuilding()`.
- `yieldBuildingStore` — supplier-building definitions.
- `heroesStore` and `guildStore` — owner names and the hero/guild owner selectors used while installing an action building.
- `useUserStore` — null-safe `isAdmin` gate.
- `yieldBuildingActionService` — atomically validates ownership and the active cycle, deducts hero gold, credits the selected existing good, increments usage, and creates a `hero-transactions` audit row.
- Firestore `cycles` one-time read — current active cycle ID/start date for yield-building defaults.

## Admin behavior
Admins see the "Додати" action for supplier buildings. Adding an owner-action building also requires selecting whether its owner is a hero or guild and then selecting that owner. Definition management in AdminView lets admins choose the income type, action cost, per-cycle usage limit, and one or more existing-good variants. Goods must be created in the AdminView goods catalog before they can be selected. Adding a supplier building writes through `islandStore.addYieldBuilding()` and does not modify the LegendKeeper map.

Inside every installed supplier-building dialog, admins can change or repair the owner assignment without removing the building. This applies to scheduled auto-harvest buildings as well as owner-action buildings. Saving writes `ownerType`, `ownerId`, and the matching compatibility field (`ownerHeroId` or `ownerGuildId`) while deleting the stale opposite field. Ownership on a scheduled building controls its appearance in hero/guild building lists only; each harvest event keeps its own destination and existing automatic distribution behavior.

## Player behavior
For hero ownership, only the logged-in hero matching the building owner sees the gather controls; gold and goods use that hero account. For guild ownership, only a logged-in leader whose `leaderGuildAccessIds` contains the owner guild can act; gold is deducted from `guilds/{guildId}.treasure`, goods are added to the guild inventory, and a `guilds/{guildId}/logs` row records both deltas. Both paths update `BuildingEntry.actionUsage`. Other visitors see an owner-only notice. Legacy `ownerHeroId` entries remain supported.

## Constraints
- Keep this tab focused on supplier buildings only.
- `incomeType` defaults to `scheduled`, preserving legacy garden definitions and their existing dialog behavior.
